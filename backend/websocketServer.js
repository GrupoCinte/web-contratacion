import { WebSocketServer } from 'ws';
import { verifyWsToken } from './middleware/auth.js';

class WSServer {
    constructor(server) {
        this.wss = new WebSocketServer({
            server,
            verifyClient: (info, callback) => {
                const protocols = info.req.headers['sec-websocket-protocol'];
                if (!protocols) {
                    callback(false, 401, 'Token requerido');
                    return;
                }

                const parts = protocols.split(',').map(p => p.trim());
                const token = parts.length > 1 ? parts[1] : parts[0];

                const user = verifyWsToken(token);
                if (!user) {
                    callback(false, 401, 'Token inválido');
                    return;
                }

                if (user.role !== 'ADMIN') {
                    callback(false, 403, 'Permisos insuficientes');
                    return;
                }

                info.req.user = user;
                info.req.wsToken = token;
                callback(true);
            }
        });

        this.clients = new Set();

        this.wss.on('connection', (ws, req) => {
            const user = req.user;
            console.log(`WebSocket: ${user.email} conectado`);
            this.clients.add(ws);

            ws.on('close', () => {
                console.log(`WebSocket: ${user.email} desconectado`);
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket client error:', error);
            });
        });

        console.log('WebSocket server initialized');
    }

    broadcast(data) {
        if (this.clients.size === 0) return;

        const message = JSON.stringify(data);
        this.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    }
}

export default WSServer;
