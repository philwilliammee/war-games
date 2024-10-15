export const files = {
  "index.js": {
    file: {
      contents: /*js*/ `
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const port = 3111;

app.use(express.json());

const stateFilePath = path.join(process.cwd(), 'tictactoe-state.json');
// const gameHistoryPath = path.join(process.cwd(), 'tictactoe-history.json');

// Initialize game state
const initializeGameState = async () => {
  return {
    board: [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    currentPlayer: 'X',
    gameOver: false,
    availableMoves: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    // wins: { X: 0, O: 0, ties: 0 }, // Track wins for X, O, and ties
    // moveHistory: [] // Track each move of the game
  };
};

// Read game state
const readGameState = async () => {
  try {
    const data = await fs.readFile(stateFilePath, 'utf8');
    const state = JSON.parse(data);

    // Ensure state has all necessary properties
    const defaultState = await initializeGameState();
    const mergedState = { ...defaultState, ...state };

    return mergedState;
  } catch (error) {
    console.error('Error reading game state:', error);
    return initializeGameState();
  }
};

// Update game state
const updateGameState = async (newState) => {
  await fs.writeFile(stateFilePath, JSON.stringify(newState));
};

// Save game history after a win or tie
// const saveGameHistory = async (finalBoard) => {
//   try {
//     const data = await fs.readFile(gameHistoryPath, 'utf8');
//     const history = JSON.parse(data);
//     history.push(finalBoard);
//     await fs.writeFile(gameHistoryPath, JSON.stringify(history, null, 2));
//   } catch (error) {
//     const initialHistory = [finalBoard];
//     await fs.writeFile(gameHistoryPath, JSON.stringify(initialHistory, null, 2));
//   }
// };

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
      return board[a];  // Return the winner ('X' or 'O')
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
  state.availableMoves = state.availableMoves.filter(move => move !== position);
  // state.moveHistory.push({ board: [...state.board], player: state.currentPlayer });

  const winner = checkWinner(state.board);

  if (winner) {
    state.gameOver = true;
    // state.wins[winner] += 1;  // Update win count for the winner
    // await saveGameHistory(state.moveHistory);  // Save the final board state
  } else if (state.availableMoves.length === 0) {
    state.gameOver = true;
    state.currentPlayer = 'Tie';
    // state.wins.ties += 1;  // Update tie count
    // await saveGameHistory(state.moveHistory);  // Save the final board state
  } else {
    state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  }

  await updateGameState(state);
  return true;
};

app.get('/', async (req, res) => {
  const state = await readGameState();

  // Ensure wins object is initialized (just in case)
  // if (!state.wins) {
  //   state.wins = { X: 0, O: 0, ties: 0 };
  // }

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
          flex-direction: column;
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
        .scoreboard {
          margin-top: 20px;
          font-size: 1.2em;
        }
      </style>
    </head>
    <body>
      <div class="game-container">
        <h1>Tic-Tac-Toe</h1>
        <div class="board">
          \${state.board.map((cell, index) => \`
            <button class="cell" onclick="makeMove(\${index})" \${state.gameOver || !state.availableMoves.includes(index) ? 'disabled' : ''}>
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
        async function makeMove(position) {
          try {
            const response = await fetch('/move', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ position })
            });
            if (response.ok) {
              window.location.reload();
            } else {
              const errorData = await response.json();
              alert(errorData.error);
            }
          } catch (error) {
            console.error('Error making move:', error);
          }
        }

        async function resetGame() {
          try {
            const response = await fetch('/reset', {
              method: 'POST'
            });
            if (response.ok) {
              window.location.reload();
            } else {
              console.error('Error resetting game:', await response.text());
            }
          } catch (error) {
            console.error('Error resetting game:', error);
          }
        }
      </script>
    </body>
    </html>
  \`;
  res.send(htmlContent);
});

app.get('/state', async (req, res) => {
  const state = await readGameState();
  res.json(state);
});

app.post('/move', async (req, res) => {
  const { position } = req.body;
  const success = await makeMove(position);
  if (success) {
    const newState = await readGameState();
    res.json(newState);
  } else {
    console.log('Invalid move to position: ', position);
    res.status(400).json({ error: 'Invalid move' });
  }
});

app.post('/reset', async (req, res) => {
  const initialState = await initializeGameState();
  await updateGameState(initialState);
  res.json({ message: 'Game reset' });
});

app.listen(port, async () => {
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
  "start": "nodemon --watch './' --ignore 'tictactoe-history.json' index.js"
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
  "gameOver": false,
  "availableMoves": [0, 1, 2, 3, 4, 5, 6, 7, 8],
}`,
    },
  },
};
