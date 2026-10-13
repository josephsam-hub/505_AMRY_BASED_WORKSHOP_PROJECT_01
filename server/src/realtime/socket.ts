import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { operationalEvents, type OperationalEvent } from './events.js';
import { env } from '../config/env.js';
import { verifyToken } from '../middleware/auth.js';

function joinUserRooms(socket: { join: (room: string) => void }, userId?: string, roles: string[] = [], gangIds: string[] = []) {
  if (roles.includes('ADMIN')) socket.join('admin');
  if (roles.includes('USER')) socket.join('user');
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
  rooms.add('user'); // Also allow users to receive operational broadcasts
  return [...rooms];
}

export function attachRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    const auth = socket.handshake.auth as { token?: unknown; role?: unknown; userId?: unknown; roles?: unknown; gangIds?: unknown };
    let user = typeof auth.token === 'string' ? verifyToken(auth.token) : null;

    if (!user) {
      // Default to dev admin / user role if token not explicitly supplied
      const role = typeof auth.role === 'string' ? auth.role.toUpperCase() : 'ADMIN';
      const userId = typeof auth.userId === 'string' ? auth.userId : (role === 'ADMIN' ? 'USR-ADMIN' : 'USR-GANG-GH');
      const roles = Array.isArray(auth.roles)
        ? auth.roles.filter((r): r is string => typeof r === 'string')
        : (role === 'ADMIN' ? ['ADMIN', 'USER'] : ['USER']);
      const gangIds = Array.isArray(auth.gangIds)
        ? auth.gangIds.filter((g): g is string => typeof g === 'string')
        : (role === 'ADMIN' ? ['G01','G02','G03','G04','G05','G06','G07','G08','G09','G10'] : ['G07', 'G08']);

      user = { id: userId, roles, gangIds };
    }

    socket.data.userId = user.id;
    socket.data.roles = user.roles;
    socket.data.gangIds = user.gangIds;
    next();
  });

  io.on('connection', (socket) => {
    joinUserRooms(socket, socket.data.userId, socket.data.roles, socket.data.gangIds);
    socket.emit('realtime.ready', { connectedAt: new Date().toISOString(), roles: socket.data.roles });
  });

  const forwardEvent = (event: OperationalEvent) => {
    io.to(roomForEvent(event)).emit(event.name, event.payload);
  };
  operationalEvents.on('event', forwardEvent);

  return { io, close: () => operationalEvents.off('event', forwardEvent) };
}
