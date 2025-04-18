# 🎯 Guessing Game

A real-time, multiplayer guessing game built with **NestJS** and **Socket.IO**, featuring a chat-like interface. Players can create and join game sessions, guess answers, and compete for points. One player acts as the game master, setting a question and answer, while others try to guess it within a time limit and limited attempts.

---

## 🚀 Features

- **Chat-like Interface**: All game events (joins, guesses, results) are shown in a real-time message list.
- **Game Sessions**:
  - Game master creates a session with a question and answer.
  - Other players can join before the game starts (minimum 3 players required).
  - Real-time updates on connected players and game status.
- **Gameplay**:
  - 3 guess attempts per player within 60 seconds.
  - First correct guess ends the game.
  - Winner gets 10 points; scores are displayed.
- **Session Management**:
  - Players cannot join active/ended sessions.
  - Game master rotates each round.
  - Session auto-deletes when all players leave.
- **Real-Time Updates**: Uses WebSockets (Socket.IO).
- **No Database**: In-memory storage (demo purposes).

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/)
- npm
- Web browser (e.g., Chrome, Firefox)

---

## 📦 Installation

### 1. Clone

```bash
git clone https://github.com/canonone/Guessing-game.git
```

### 2. Install Dependencies

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io @nestjs/serve-static
```

### 3. Project Structure

Ensure your folder looks like this:

```
guessing-game/
├── public/
│   └── index.html
├── src/
│   ├── game/
│   │   ├── game.module.ts
│   │   ├── game.service.ts
│   │   ├── game.gateway.ts
│   ├── app.module.ts
│   ├── main.ts
├── package.json
```

Copy all required files into their respective paths.

### 4. Verify Static Files

```bash
ls -l guessing-game/public/
```

### 5. Run the Application

```bash
npm run start:dev
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## 🎮 Usage

### Open in Browser

Navigate to: `http://localhost:3000`

You’ll see:

- Username, Session ID, Question & Answer inputs
- Controls: Create/Join Session, Set New Question, Start Game, Leave Session
- Message list for real-time updates
- Guess input field

### Create a Session (Game Master)

1. Enter a **Username** (e.g., `player1`)
2. Enter a **Question** (e.g., `What is 2+2?`)
3. Enter the **Answer** (`4`)
4. Click **Create Session**

Session ID (e.g., `abc123`) will appear. Message log will show session creation.

### Join Session (Other Players)

1. Open more tabs/incognito windows
2. Enter different usernames (e.g., `player2`, `player3`)
3. Use the same Session ID
4. Click **Join Session**

All players see the updated player list and session info.

### Start Game

Game master clicks **Start Game** — all players see:

```
Game started! Question: What is 2+2?
```

### Submit Guesses

Each player can:

1. Enter a guess (e.g., `4`)
2. Click **Guess**

Correct guess:

```
Game ended! Winner: player2, Answer: 4
Scores: player1: 0, player2: 10, player3: 0
New Game Master: player3
```

### New Game Round

New master enters a new question and answer, then clicks **Set New Question** and **Start Game** again.

### Leave Session

Click **Leave Session** to exit. Session is deleted when all players leave.

---

## 🧪 Notes

- Use **unique usernames**.
- **3+ players** are required to start.
- Sessions are **in-memory** — lost on restart.
- Open **multiple tabs** or incognito windows to simulate multiple players.

---

## 📁 Project Files Overview

| File                          | Description |
|-------------------------------|-------------|
| `public/index.html`           | Frontend UI, uses Socket.IO client |
| `src/app.module.ts`           | Root module, loads `GameModule`, serves static files |
| `src/main.ts`                 | Application entry point |
| `src/game/game.module.ts`     | Game module definition |
| `src/game/game.service.ts`    | Handles all game/session logic |
| `src/game/game.gateway.ts`    | Handles WebSocket events |

---

## 👨‍💻 Development

### Start in Dev Mode

```bash
npm run start:dev
```

### Debugging

- Use `console.log()` inside `GameService` or `GameGateway`
- Use browser DevTools (`F12`) to monitor WebSocket events
- Check public file visibility:

```bash
ls -l public/
chmod -R 755 public/
```

---

## ⚠️ Known Limitations

- **In-Memory Storage**: All data is lost on restart. Add a DB like Redis or MongoDB for persistence.
- **No Authentication**: Users are identified by username only.
- **Basic UI**: Could be upgraded with a frontend framework like React or Vue.

## 🧠 Contribute

Pull requests welcome! Feel free to suggest enhancements or report bugs.

---

## 📜 License

This project is for educational/demo purposes and uses in-memory data only.