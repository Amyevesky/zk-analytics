// analytics.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class AnalyticsGateway implements OnGatewayInit {
    @WebSocketServer()
    server: Server;

    afterInit() {
        console.log('WebSocket initialized');
    }

    emitTxCountUpdated(newCount: number) {
        this.server.emit('txCountUpdated', { count: newCount });
    }
}
