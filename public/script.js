const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const usernameInput = document.getElementById('username');
const sessionIdInput = document.getElementById('sessionId');
const questionInput = document.getElementById('question');
const answerInput = document.getElementById('answer');
const messages = document.getElementById('messages');
const leaderboard = document.getElementById('leaderboard');
const countdown = document.getElementById('countdown');

let countdownInterval = null;

function addMessage(msg, username, isSystem = false) {
  const item = document.createElement('li');
  item.textContent = msg;
  if (isSystem) {
    item.classList.add('system');
  } else {
    item.classList.add('player');
    item.setAttribute('data-username', username || 'Unknown');
  }
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

function updateLeaderboard(players, scores) {
  leaderboard.innerHTML = '';
  players.forEach((player, index) => {
    const score = scores ? scores.find(s => s.username === player)?.score || 0 : 0;
    const playerDiv = document.createElement('div');
    playerDiv.textContent = `${player}: ${score}`;
    leaderboard.appendChild(playerDiv);
  });
}

function startCountdown(duration) {
  let timeLeft = duration;
  countdown.textContent = `00:${timeLeft.toString().padStart(2, '0')}`;
  countdown.style.display = 'block';

  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    timeLeft--;
    countdown.textContent = `00:${timeLeft.toString().padStart(2, '0')}`;
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      countdown.style.display = 'none';
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdown.style.display = 'none';
  countdown.textContent = '00:60';
}

function createSession() {
  const username = usernameInput.value;
  const question = questionInput.value;
  const answer = answerInput.value;
  if (!username || !question || !answer) {
    addMessage('Please enter username, question, and answer', null, true);
    return;
  }
  socket.emit('createSession', { username, question, answer });
}

function joinSession() {
  const username = usernameInput.value;
  const sessionId = sessionIdInput.value;
  if (!username || !sessionId) {
    addMessage('Please enter username and session ID', null, true);
    return;
  }
  socket.emit('joinSession', { sessionId, username });
}

function startSession() {
  const sessionId = sessionIdInput.value;
  if (!sessionId) {
    addMessage('Please enter session ID', null, true);
    return;
  }
  socket.emit('startSession', { sessionId });
}

function setNewQuestion() {
  const username = usernameInput.value;
  const sessionId = sessionIdInput.value;
  const question = questionInput.value;
  const answer = answerInput.value;
  if (!sessionId || !question || !answer || !username) {
    addMessage('Please enter username, session ID, question, and answer', null, true);
    return;
  }
  socket.emit('setNewQuestion', { sessionId, question, answer, username });
}

function leaveSession() {
  const username = usernameInput.value;
  const sessionId = sessionIdInput.value;
  if (!sessionId || !username) {
    addMessage('Please enter username and session ID', null, true);
    return;
  }
  socket.emit('leaveSession', { sessionId });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const guess = input.value;
  const username = usernameInput.value;
  const sessionId = sessionIdInput.value;
  if (!guess || !username || !sessionId) {
    addMessage('Please enter guess, username, and session ID', null, true);
    return;
  }
  socket.emit('submitGuess', { sessionId, username, guess });
  input.value = '';
});

socket.on('sessionCreated', (data) => {
  sessionIdInput.value = data.sessionId;
  addMessage(`Session created with ID: ${data.sessionId}`, usernameInput.value);
});

socket.on('playerJoined', (data) => {
  addMessage(
    `${data.username} joined the session. Game duration: 60 seconds.`,
    null,
    true
  );
  updateLeaderboard(data.players, null);
});

socket.on('playerUpdate', (data) => {
  addMessage(
    `Players: ${data.players.join(', ')} (Total: ${data.playerCount}) | Game Master: ${
      data.gameMaster
    } | Status: ${data.status}`,
    null,
    true
  );
  updateLeaderboard(data.players, null);
});

socket.on('gameStarted', (data) => {
  addMessage(`Game started! Question: ${data.question}`, null, true);
  startCountdown(60);
});

socket.on('guessMade', (data) => {
  addMessage(
    `${data.username} guessed '${data.guess}' - ${data.correct ? 'Correct' : 'Incorrect'}, Attempts: ${data.attempts}/3`,
    null,
    true
  );
});

socket.on('guessResult', (data) => {
  addMessage(
    data.correct ? 'Correct guess!' : `Incorrect guess. Attempts used: ${data.attempts}/3`,
    usernameInput.value
  );
});

socket.on('noAttemptsLeft', (data) => {
  addMessage(data.message, null, true);
});

socket.on('gameEnded', (data) => {
  const scores = data.scores.map((s) => `${s.username}: ${s.score}`).join(', ');
  addMessage(
    `Game ended! Winner: ${data.winner || 'None'}, Answer: ${data.answer}, Scores: ${scores}, New Game Master: ${
      data.newGameMaster || 'None'
    }`,
    null,
    true
  );
  updateLeaderboard(data.scores.map(s => s.username), data.scores);
  stopCountdown();
});

socket.on('gameMasterNotification', (data) => {
  if (usernameInput.value === data.gameMaster) {
    addMessage(data.message, null, true);
  }
});

socket.on('message', (msg) => {
  addMessage(msg, null, true);
});

socket.on('error', (data) => {
  addMessage(`Error: ${data.message}`, null, true);
});