import { Injectable, Logger } from "@nestjs/common";
import { 
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
 } from "@nestjs/websockets";
import { Socket, Server } from "socket.io";

function queueRoom(hospitalId: string, doctorId: string, date: string){
    return `queue:${hospitalId}:${doctorId}:${date}`;
}

/**
 * Powers the "live token/queue status" requirement - the waiting-room TV
 * board and the patient's "you are #4, ~20 min wait" screen both connect
 * here and join a room scoped to (hospital, doctor, date). Any check-in /
 * consultation-start / completion / cancellation broadcasts an update to
 * everyone in that room instantly, no polling needed.
 *
 * Auth note: for the foundation build this accepts any connection and
 * relies on room names being effectively unguessable (Mongo ObjectIds) -
 * production hardening should verify the JWT on the socket handshake too.
 */
@Injectable()
@WebSocketGateway({cors:{origin:'*'}, namespace:'queue'})
export class AppointmentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger('AppointmentsGateway');

    handleConnection(client: Socket){
        this.logger.debug(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket){
        this.logger.debug(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join-queue')
    hanldeJoinQueue(client: Socket, payload: {hospitalId: string, doctorId: string, date: string}){
        const room = queueRoom(payload.hospitalId, payload.doctorId, payload.date);
        client.join(room);
        return {joined: room};
    }

    @SubscribeMessage('leave-queue')
    handleLeaveQueue(client: Socket, payload: {hospitalId: string, doctorId: string, date: string}){
        client.leave(queueRoom(payload.hospitalId, payload.doctorId, payload.date));
    }

    // Called from AppointmentsService on whenever queue state changes.
    broadcastQueueUpdate(hospitalId: string, doctorId: string, date: string, queue: unknown){
        this.server.to(queueRoom(hospitalId, doctorId, date)).emit('queue-update', queue);
    }
}
