// src/wallets/wallets.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class WalletsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server | undefined;

  private readonly logger = new Logger(WalletsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  notifyDeposit(walletAddress: string, amount: number) {
    if (!this.server) {
      console.error('WebSocket server is not initialized.');
      return;
    }

    console.log(
      `Emitting 'usdtDeposit' event to all clients: Wallet Address: ${walletAddress}, Amount: ${amount}`,
    );

    this.server.emit('usdtDeposit', { walletAddress, amount });
  }
}
