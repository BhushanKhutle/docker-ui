import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'uitp-jwt-secret-change-in-production';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  isAlive: boolean;
}

class WSServer {
  private wss: WebSocketServer;
  private clients: Set<ExtendedWebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: ExtendedWebSocket, req) => {
      ws.isAlive = true;

      // Authenticate via query param
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
          ws.userId = decoded.id;
        } catch {
          ws.close(1008, 'Invalid token');
          return;
        }
      }

      this.clients.add(ws);

      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
    });

    // Heartbeat
    const interval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => clearInterval(interval));
  }

  broadcast(data: object): void {
    const message = JSON.stringify(data);
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  sendToUser(userId: string, data: object): void {
    const message = JSON.stringify(data);
    this.clients.forEach((ws) => {
      if (ws.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

let wsServerInstance: WSServer | null = null;

export function initWebSocketServer(server: Server): WSServer {
  wsServerInstance = new WSServer(server);
  return wsServerInstance;
}

export function getWebSocketServer(): WSServer | null {
  return wsServerInstance;
}
