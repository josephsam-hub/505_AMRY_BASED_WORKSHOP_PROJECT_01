import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { operationalEvents, type OperationalEvent } from './events.js';
import { env } from '../config/env.js';

function joinUserRooms(socket: { join: (room: string) => void }, userId?: string, roles: string[] = [], gangIds: string[] = []) {
  if (roles.includes('ADMIN')) socket.join('admin');
  if (userId) socket.join(`user:${userId}`);
  for (const gangId of gangIds) socket.join(`gang:${gangId}`);
}

function roomForEvent(event: OperationalEvent) {
  const rooms = new Set<string>();
  const { tankId, processId, gangId, bayId, userId } = event.payload;
  if (typeof tankId === 'string') rooms.add(`tank:${tankId}`);
  if (typeof processId === 'string') rooms.add(`process:${processId}`);
  if (typeof gangId === 'string') rooms.add(`gang:${gangId}`);
  if (typeof bayId === 'string') rooms.add(`bay:${bayId}`);
  if (typeof userId === 'string') rooms.add(`user:${userId}`);
  rooms.add('admin');
  return [...rooms];
}

export function attachRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    const auth = socket.handshake.auth as { userId?: unknown; roles?: unknown; gangIds?: unknown };
    const userId = typeof auth.userId === 'string' ? auth.userId : undefined;
    const roles = Array.isArray(auth.roles) ? auth.roles.filter((role): role is string => typeof role === 'string') : [];
    const gangIds = Array.isArray(auth.gangIds) ? auth.gangIds.filter((gang): gang is string => typeof gang === 'string') : [];
    socket.data.userId = userId;
    socket.data.roles = roles;
    socket.data.gangIds = gangIds;
    next();
  });

  io.on('connection', (socket) => {
    joinUserRooms(socket, socket.data.userId, socket.data.roles, socket.data.gangIds);
    socket.emit('realtime.ready', { connectedAt: new Date().toISOString() });
  });

  const forwardEvent = (event: OperationalEvent) => {
    io.to(roomForEvent(event)).emit(event.name, event.payload);
  };
  operationalEvents.on('event', forwardEvent);

  return { io, close: () => operationalEvents.off('event', forwardEvent) };
}
