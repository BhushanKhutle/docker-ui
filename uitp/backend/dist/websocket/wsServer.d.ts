import { Server } from 'http';
declare class WSServer {
    private wss;
    private clients;
    constructor(server: Server);
    broadcast(data: object): void;
    sendToUser(userId: string, data: object): void;
}
export declare function initWebSocketServer(server: Server): WSServer;
export declare function getWebSocketServer(): WSServer | null;
export {};
//# sourceMappingURL=wsServer.d.ts.map