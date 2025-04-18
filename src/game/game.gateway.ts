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
      this.server.to(`session_${session.id}`).emit('playerJoined', {
        username: payload.username,
        players: session.players.map((p) => p.username),
      });
      client.emit('message', `Joined session ${session.id}`);
      this.broadcastPlayerUpdate(session.id);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('startSession')
  handleStartSession(client: Socket, payload: { sessionId: string }) {
    try {
      const session = this.gameService.startSession(payload.sessionId, client.id);
      this.server
        .to(`session_${session.id}`)
        .emit('gameStarted', { question: session.question });
      this.broadcastPlayerUpdate(session.id);
      setTimeout(() => {
        const currentSession = this.gameService.getSession(payload.sessionId);
        if (currentSession?.status === 'active') {
          const result = this.gameService.endSession(payload.sessionId, null);
          if (result) {
            this.server.to(`session_${payload.sessionId}`).emit('gameEnded', result);
            if (result.newGameMaster) {
              const newGameMasterPlayer = currentSession.players.find(
                (p) => p.username === result.newGameMaster,
              );
              if (newGameMasterPlayer) {
                this.server
                  .to(newGameMasterPlayer.socketId)
                  .emit('gameMasterNotification', {
                    gameMaster: result.newGameMaster,
                    message:
                      'You are the new Game Master! Set a new question or start a new session.',
                  });
              }
            }
          }
        }
      }, 60 * 1000);
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
      // Broadcast guess details to all players
      this.server.to(`session_${payload.sessionId}`).emit('guessMade', {
        username: payload.username,
        guess: payload.guess,
        correct: result.correct,
        attempts: result.attempts,
      });
      
      if (result.correct) {
        const session = this.gameService.getSession(payload.sessionId);
        const endResult = this.gameService.endSession(
          payload.sessionId,
          result.winner,
        );
        this.server.to(`session_${payload.sessionId}`).emit('gameEnded', endResult);
        if (endResult && endResult.newGameMaster) {
          const newGameMasterPlayer = session.players.find(
            (p) => endResult && p.username === endResult.newGameMaster,
          );
          if (newGameMasterPlayer) {
            this.server
              .to(newGameMasterPlayer.socketId)
              .emit('gameMasterNotification', {
                gameMaster: endResult?.newGameMaster,
                message:
                  'You are the new Game Master! Set a new question or start a new session.',
              });
          }
        }
        if (client.id === session.winnerId) {
          client.emit('message', 'You have won!');
        }
      } else {
        client.emit('guessResult', result);
        if (result.attempts >= 3) {
          client.emit('noAttemptsLeft', {
            message: 'No more attempts remaining',
          });
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
      const session = this.gameService.leaveSession(payload.sessionId, client.id);
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