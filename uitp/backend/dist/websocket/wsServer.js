"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocketServer = initWebSocketServer;
exports.getWebSocketServer = getWebSocketServer;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'uitp-jwt-secret-change-in-production';
class WSServer {
    constructor(server) {
        this.clients = new Set();
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
        this.wss.on('connection', (ws, req) => {
            ws.isAlive = true;
            // Authenticate via query param
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            if (token) {
                try {
                    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                    ws.userId = decoded.id;
                }
                catch {
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
    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach((ws) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(message);
            }
        });
    }
    sendToUser(userId, data) {
        const message = JSON.stringify(data);
        this.clients.forEach((ws) => {
            if (ws.userId === userId && ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(message);
            }
        });
    }
}
let wsServerInstance = null;
function initWebSocketServer(server) {
    wsServerInstance = new WSServer(server);
    return wsServerInstance;
}
function getWebSocketServer() {
    return wsServerInstance;
}
//# sourceMappingURL=wsServer.js.map