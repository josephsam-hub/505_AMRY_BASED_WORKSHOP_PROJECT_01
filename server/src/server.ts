import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { attachRealtime } from './realtime/socket.js';

const httpServer = createServer(app);
attachRealtime(httpServer);

httpServer.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Workshop API listening on http://0.0.0.0:${env.PORT}`);
});
