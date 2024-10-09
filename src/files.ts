export const files = {
  "index.js": {
    file: {
      contents: `
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const port = 3111;

app.use(express.json());

const stateFilePath = path.join(process.cwd(), 'tictactoe-state.json');

// Initialize game state
const initializeGameState = async () => {
  const initialState = {
    board: [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    currentPlayer: 'X',
    gameOver: false
  };
  // await fs.writeFile(stateFilePath, JSON.stringify(initialState));
};

// Read game state
const readGameState = async () => {
  try {
    const data = await fs.readFile(stateFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading game state:', error);
    return null;
  }
};

// Update game state
const updateGameState = async (newState) => {
  await fs.writeFile(stateFilePath, JSON.stringify(newState));
};

// Check for a winner
const checkWinner = (board) => {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ];

  for (let pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] !== ' ' && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
};

// Make a move
const makeMove = async (position) => {
  const state = await readGameState();
  if (!state || state.gameOver || state.board[position] !== ' ') {
    return false;
  }

  state.board[position] = state.currentPlayer;
  const winner = checkWinner(state.board);

  if (winner) {
    state.gameOver = true;
  } else if (!state.board.includes(' ')) {
    state.gameOver = true;
    state.currentPlayer = 'Tie';
  } else {
    state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  }

  await updateGameState(state);
  return true;
};

// AI move (simple random move)
const aiMove = async () => {
  const state = await readGameState();
  if (!state || state.gameOver) return;

  const emptyPositions = state.board.reduce((acc, cell, index) => {
    if (cell === ' ') acc.push(index);
    return acc;
  }, []);

  if (emptyPositions.length > 0) {
    const randomPosition = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
    await makeMove(randomPosition);
  }
};

app.get('/', async (req, res) => {
  const state = await readGameState();
  const htmlContent = \`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tic-Tac-Toe</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f0f0f0;
        }
        .game-container {
          text-align: center;
        }
        .board {
          display: grid;
          grid-template-columns: repeat(3, 100px);
          grid-gap: 5px;
          margin-top: 20px;
        }
        .cell {
          width: 100px;
          height: 100px;
          font-size: 2em;
          background-color: #fff;
          border: 2px solid #333;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .cell:hover {
          background-color: #eee;
        }
        .status {
          margin-top: 20px;
          font-size: 1.2em;
        }
        .reset-button {
          margin-top: 20px;
          padding: 10px 20px;
          font-size: 1em;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="game-container">
        <h1>Tic-Tac-Toe</h1>
        <div class="board">
          \${state.board.map((cell, index) => \`
            <button class="cell" onclick="makeMove(\${index})" \${state.gameOver ? 'disabled' : ''}>
              \${cell === ' ' ? '&nbsp;' : cell}
            </button>
          \`).join('')}
        </div>
        <div class="status">
          \${state.gameOver
            ? (state.currentPlayer === 'Tie'
                ? "It's a tie!"
                : \`Player \${state.currentPlayer} wins!\`)
            : \`Current player: \${state.currentPlayer}\`}
        </div>
        <button class="reset-button" onclick="resetGame()">Reset Game</button>
      </div>
      <script>
        function makeMove(position) {
          fetch('/move', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ position }),
          })
          .then(response => response.json())
          .then(() => {
            window.location.reload();
          });
        }

        function resetGame() {
          fetch('/reset', { method: 'POST' })
          .then(() => {
            window.location.reload();
          });
        }
      </script>
    </body>
    </html>
  \`;
  res.send(htmlContent);
});

app.post('/move', async (req, res) => {
  const { position } = req.body;
  const success = await makeMove(position);
  if (success) {
    await aiMove(); // AI makes a move after the player
    const newState = await readGameState();
    res.json(newState);
  } else {
    res.status(400).json({ error: 'Invalid move' });
  }
});

app.post('/reset', async (req, res) => {
  await initializeGameState();
  res.json({ message: 'Game reset' });
});

app.listen(port, async () => {
  await initializeGameState();
  console.log(\`Tic-Tac-Toe game is live at http://localhost:\${port}\`);
});`,
    },
  },
  "package.json": {
    file: {
      contents: `
{
  "name": "tictactoe-game",
  "type": "module",
  "dependencies": {
    "express": "latest",
    "nodemon": "latest"
  },
  "scripts": {
    "start": "nodemon --watch './' index.js"
  }
}`,
    },
  },
  "tictactoe-state.json": {
    file: {
      contents: `
{
  "board": [" ", " ", " ", " ", " ", " ", " ", " ", " "],
  "currentPlayer": "X",
  "gameOver": false
}`,
    },
  },
};
