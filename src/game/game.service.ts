import { Injectable } from '@nestjs/common';
import { Player, GameSession } from './game-interface';

@Injectable()
export class GameService {
  private sessions: { [sessionId: string]: GameSession } = {};

  createSession(
    socketId: string,
    username: string,
    question: string,
    answer: string,
  ) {
    if (!username || !question || !answer) {
      throw new Error('Username, question, or answer not found');
    }
    const sessionId = Math.random().toString(36).substring(7);

    this.sessions[sessionId] = {
      id: sessionId,
      gameMasterId: socketId,
      gameMasterusername: username,
      status: 'waiting',
      question,
      answer,
      players: [{ socketId, username, attempts: 0, score: 0 }],
    };
    return this.sessions[sessionId];
  }

  joinSession(sessionId: string, socketId: string, username: string) {
    const session = this.sessions[sessionId];

    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status !== 'waiting') {
      throw new Error('Cannot join: session already started or ended');
    }
    if (session.players.find((p) => p.username === username)) {
      throw new Error('Username already exists');
    }

    session.players.push({ socketId, username, attempts: 0, score: 0 });

    return session;
  }

  startSession(sessionId: string, socketId: string) {
    const session = this.sessions[sessionId];

    if (!session) {
      throw new Error('Session not found');
    }
    if (session.gameMasterId !== socketId) {
      throw new Error('Only the game master can start the session');
    }
    if (session.status !== 'waiting') {
      throw new Error('Session already started or ended');
    }
    if (session.players.length < 3) {
      throw new Error('Minimum of 3 players needed to start session');
    }

    session.status = 'active';
    session.startedAt = Date.now();
    return session;
  }

  submitGuess(
    sessionId: string,
    socketId: string,
    username: string,
    guess: string,
  ) {
    const session = this.sessions[sessionId];

    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status !== 'active') {
      throw new Error('The session is not active');
    }
    const player = session.players.find((p) => p.socketId === socketId);

    if (!player || player.username !== username) {
      throw new Error('Player not in session');
    }
    if (player.attempts >= 3) {
      throw new Error('No attempts remaining');
    }
    player.attempts += 1;

    const correct = guess.toLowerCase() === session.answer.toLowerCase();
    if (correct) {
      player.score += 10;
      session.winnerId = socketId;
    }

    return { correct, winner: correct ? username : null, attempts: player.attempts, guess };
  }

  endSession(sessionId: string, winner: string | null) {
    const session = this.sessions[sessionId];
    if (!session) {
      return;
    }

    session.status = 'ended';
    const scores = session.players.map((p) => ({
      username: p.username,
      score: p.score,
    }));

    // Select a new game master randomly from non-game-master players
    const otherPlayers = session.players.filter(
      (p) => p.socketId !== session.gameMasterId,
    );
    const newGameMaster =
      otherPlayers.length > 0
        ? otherPlayers[Math.floor(Math.random() * otherPlayers.length)]
        : null;

    const result = {
      winner,
      answer: session.answer,
      scores,
      newGameMaster: newGameMaster ? newGameMaster.username : null,
    };

    if (newGameMaster) {
      session.gameMasterId = newGameMaster.socketId;
      session.gameMasterusername = newGameMaster.username;
      session.status = 'waiting';
      session.question = '';
      session.answer = '';
      session.winnerId = undefined;
      session.startedAt = undefined;
      session.players.forEach((p) => (p.attempts = 0));
    } else {
      delete this.sessions[sessionId];
    }

    return result;
  }

  leaveSession(sessionId: string, socketId: string) {
    const session = this.sessions[sessionId];
    if (!session) {
      return;
    }
    session.players = session.players.filter((p) => p.socketId !== socketId);
    if (session.gameMasterId === socketId && session.players.length > 0) {
      const newGameMaster = session.players[0];
      session.gameMasterId = newGameMaster.socketId;
      session.gameMasterusername = newGameMaster.username;
    }
    if (session.players.length === 0) {
      delete this.sessions[sessionId];
    }
    return session;
  }

  setNewQuestion(
    sessionId: string,
    socketId: string,
    question: string,
    answer: string,
  ) {
    const session = this.sessions[sessionId];
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.gameMasterId !== socketId) {
      throw new Error('Only the game master can set a new question');
    }
    if (session.status !== 'waiting') {
      throw new Error('Session must be in waiting state');
    }
    if (!question || !answer) {
      throw new Error('Question and answer are required');
    }
    session.question = question;
    session.answer = answer;
    return session;
  }

  getSession(sessionId: string) {
    return this.sessions[sessionId];
  }
}