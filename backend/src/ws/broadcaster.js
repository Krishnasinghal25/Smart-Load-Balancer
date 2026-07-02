import { WebSocketServer } from 'ws';
import config from '../config.js';
import logger from '../utils/logger.js';

// Broadcasts full system telemetry to all connected dashboard clients.
export class Broadcaster {
  constructor(httpServer, getState) {
    this.getState = getState;
    this.wss = new WebSocketServer({ server: httpServer, path: '/metrics' });
    this.clients = new Set();

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      logger.info(`dashboard connected (${this.clients.size} clients)`);
      ws.send(JSON.stringify(this.getState()));
      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });

    this._timer = setInterval(() => this.tick(), config.telemetryIntervalMs);
  }

  tick() {
    if (!this.clients.size) return;
    const payload = JSON.stringify(this.getState());
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  stop() { clearInterval(this._timer); this.wss.close(); }
}

export default Broadcaster;
