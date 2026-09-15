import { SocketStream } from '@fastify/websocket';
import { FastifyRequest } from 'fastify';

interface WsClient {
  id: string;
  socket: any;
  machineId?: string;
  groupId?: string;
  isAlive: boolean;
  connectedAt: Date;
}

class MetricsWsHub {
  private clients = new Map<string, WsClient>();
  private pingInterval: any = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, id) => {
        if (!client.isAlive) {
          try {
            client.socket.terminate();
          } catch {}
          this.clients.delete(id);
          return;
        }
        client.isAlive = false;
        try {
          client.socket.ping();
        } catch {
          this.clients.delete(id);
        }
      });
    }, 30000);
  }

  handleConnection(connection: SocketStream, req: FastifyRequest) {
    const socket = connection.socket;
    const clientId = Math.random().toString(36).substring(2, 11);

    const client: WsClient = {
      id: clientId,
      socket,
      isAlive: true,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    socket.on('pong', () => {
      client.isAlive = true;
    });

    socket.on('message', (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe') {
          client.machineId = msg.machineId || undefined;
          client.groupId = msg.groupId || undefined;
          socket.send(
            JSON.stringify({
              type: 'subscribed',
              machineId: client.machineId,
              groupId: client.groupId,
              timestamp: new Date().toISOString(),
            })
          );
        } else if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (err) {
        // ignore invalid JSON
      }
    });

    socket.on('close', () => {
      this.clients.delete(clientId);
    });

    socket.on('error', () => {
      this.clients.delete(clientId);
    });

    // Send initial welcome message
    socket.send(
      JSON.stringify({
        type: 'status',
        status: 'CONNECTED',
        message: 'Connected to Palma NOC Metrics Real-Time Hub',
        clientsCount: this.clients.size,
        timestamp: new Date().toISOString(),
      })
    );
  }

  broadcast(event: {
    type: 'metric' | 'status' | 'alert' | 'service_change' | 'port_change';
    machineId?: string;
    groupId?: string;
    data: any;
    timestamp?: string;
  }) {
    const payload = JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });

    this.clients.forEach((client) => {
      // Filter if client subscribed to specific machine
      if (client.machineId && event.machineId && client.machineId !== event.machineId) {
        return;
      }
      // Filter if client subscribed to specific group
      if (client.groupId && event.groupId && client.groupId !== event.groupId) {
        return;
      }

      try {
        if (client.socket.readyState === 1 /* OPEN */) {
          client.socket.send(payload);
        }
      } catch (err) {
        this.clients.delete(client.id);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const metricsWsHub = new MetricsWsHub();
