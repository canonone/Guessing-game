import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';


@WebSocketGateway({ cors: true })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  @SubscribeMessage('createSession')
  handleCreateSession(
    client: Socket,
    payload: { username: string; question: string; answer: string },
  ) {
    try {
      const session = this.gameService.createSession(
        client.id,
        payload.username,
        payload.question,
        payload.answer,
      );
      client.join(`session_${session.id}`);
      client.emit('sessionCreated', { sessionId: session.id });
      this.broadcastPlayerUpdate(session.id);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('joinSession')
  handleJoinSession(
    client: Socket,
    payload: { sessionId: string; username: string },
  ) {
    try {
      const session = this.gameService.joinSession(
        payload.sessionId,
        client.id,
        payload.username,
      );
      client.join(`session_${session.id}`);
      this.broadcastPlayerUpdate(session.id);
      client.emit('message', `Joined session ${session.id}`);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('startSession')
  handleStartSession(client: Socket, payload: { sessionId: string }) {
    try {
      const session = this.gameService.startSession(
        payload.sessionId,
        client.id,
      );
      this.server
        .to(`session_${session.id}`)
        .emit('gameStarted', { question: session.question });
      this.broadcastPlayerUpdate(session.id);
      this.server
        .to(`session_${session.id}`)
        .emit('message', `Game started! Question: ${session.question}`);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('submitGuess')
  handleSubmitGuess(
    client: Socket,
    payload: { sessionId: string; username: string; guess: string },
  ) {
    try {
      const result = this.gameService.submitGuess(
        payload.sessionId,
        client.id,
        payload.username,
        payload.guess,
      );
      if (result.correct) {
        const session = this.gameService.getSession(payload.sessionId);
        this.server.to(`session_${payload.sessionId}`).emit('gameEnded', {
          winner: result.winner,
          answer: session.answer,
          scores: session.players.map((p) => ({
            username: p.username,
            score: p.score,
          })),
          newGameMaster: session.gameMasterusername,
        });
        this.server
          .to(`session_${payload.sessionId}`)
          .emit(
            'message',
            `Game ended! Winner: ${result.winner}, Answer: ${session.answer}`,
          );
        if (client.id === session.winnerId) {
          client.emit('message', 'You have won!');
        }
        this.broadcastPlayerUpdate(payload.sessionId);
      } else {
        client.emit('guessResult', result);
        client.emit(
          'message',
          result.correct
            ? 'Correct guess!'
            : `Incorrect guess. Attempts used: ${result.attempts}/3`,
        );
        if (result.attempts >= 3) {
          client.emit('noAttemptsLeft', {
            message: 'No more attempts remaining',
          });
          client.emit('message', 'No more attempts remaining');
        }
      }
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('setNewQuestion')
  handleSetNewQuestion(
    client: Socket,
    payload: { sessionId: string; question: string; answer: string },
  ) {
    try {
      const session = this.gameService.setNewQuestion(
        payload.sessionId,
        client.id,
        payload.question,
        payload.answer,
      );
      this.server
        .to(`session_${session.id}`)
        .emit('message', `New question set by ${session.gameMasterusername}`);
      this.broadcastPlayerUpdate(session.id);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('leaveSession')
  handleLeaveSession(client: Socket, payload: { sessionId: string }) {
    try {
      const session = this.gameService.leaveSession(
        payload.sessionId,
        client.id,
      );
      if (session) {
        this.broadcastPlayerUpdate(payload.sessionId);
        this.server
          .to(`session_${payload.sessionId}`)
          .emit(
            'message',
            `Player left. New game master: ${session.gameMasterusername || 'None'}`,
          );
      }
      client.emit('message', 'You have left the session');
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  private broadcastPlayerUpdate(sessionId: string) {
    const session = this.gameService.getSession(sessionId);
    if (session) {
      this.server.to(`session_${sessionId}`).emit('playerUpdate', {
        playerCount: session.players.length,
        players: session.players.map((p) => p.username),
        gameMaster: session.gameMasterusername,
        status: session.status,
      });
    }
  }
}
