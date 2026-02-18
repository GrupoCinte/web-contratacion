
import { WebSocketServer } from 'ws';

class WSServer {
    constructor(server) {
        this.wss = new WebSocketServer({ server });
        this.clients = new Set();

        this.wss.on('connection', (ws) => {
            console.log('Client connected to WebSocket');
            this.clients.add(ws);

            ws.on('close', () => {
                console.log('Client disconnected from WebSocket');
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
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(message);
            }
        });
    }
}

export default WSServer;
