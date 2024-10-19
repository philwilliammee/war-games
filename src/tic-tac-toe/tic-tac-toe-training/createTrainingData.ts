import * as csvWriter from 'csv-writer';

// Define the players and empty cell
const PLAYER_X = 'X'; // Maximizing player
const PLAYER_O = 'O'; // Minimizing player
const EMPTY = ' '; // Empty cell

// Define CSV writer
const writer = csvWriter.createObjectCsvWriter({
  path: './tic_tac_toe_dataset.csv',
  header: [
    { id: 'Cell_0', title: 'Cell_0' },
    { id: 'Cell_1', title: 'Cell_1' },
    { id: 'Cell_2', title: 'Cell_2' },
    { id: 'Cell_3', title: 'Cell_3' },
    { id: 'Cell_4', title: 'Cell_4' },
    { id: 'Cell_5', title: 'Cell_5' },
    { id: 'Cell_6', title: 'Cell_6' },
    { id: 'Cell_7', title: 'Cell_7' },
    { id: 'Cell_8', title: 'Cell_8' },
    { id: 'Optimal_Moves', title: 'Optimal_Moves' }
  ]
});

function isWinner(board: string[], player: string): boolean {
  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]  // Diagonals
  ];
  return winningCombinations.some(combo => combo.every(index => board[index] === player));
}

function isBoardFull(board: string[]): boolean {
  return board.every(cell => cell !== EMPTY);
}

function getAvailableMoves(board: string[]): number[] {
  return board.map((cell, index) => (cell === EMPTY ? index : null)).filter(index => index !== null) as number[];
}

function nextPlayer(board: string[]): string {
  const xCount = board.filter(cell => cell === PLAYER_X).length;
  const oCount = board.filter(cell => cell === PLAYER_O).length;
  return xCount > oCount ? PLAYER_O : PLAYER_X;
}

function minimax(board: string[], isMaximizing: boolean): number {
  if (isWinner(board, PLAYER_X)) return 1;  // Maximizing player win
  if (isWinner(board, PLAYER_O)) return -1; // Minimizing player win
  if (isBoardFull(board)) return 0;         // It's a draw

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const move of getAvailableMoves(board)) {
      board[move] = PLAYER_X;
      const score = minimax(board, false);
      board[move] = EMPTY;
      bestScore = Math.max(score, bestScore);
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (const move of getAvailableMoves(board)) {
      board[move] = PLAYER_O;
      const score = minimax(board, true);
      board[move] = EMPTY;
      bestScore = Math.min(score, bestScore);
    }
    return bestScore;
  }
}

function findBestMoves(board: string[]): number[] {
  const currentPlayer = nextPlayer(board);
  let bestScore = currentPlayer === PLAYER_X ? -Infinity : Infinity;
  let bestMoves: number[] = [];

  for (const move of getAvailableMoves(board)) {
    board[move] = currentPlayer;
    const score = minimax(board, currentPlayer === PLAYER_O);
    board[move] = EMPTY;

    // Optimize for draw if no win is possible
    if ((currentPlayer === PLAYER_X && score > bestScore) || (currentPlayer === PLAYER_O && score < bestScore)) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  return bestMoves;
}

function generateAllBoards(board: string[], boardsSet: Set<string>): void {
  const boardKey = board.join('');
  if (boardsSet.has(boardKey)) return;
  boardsSet.add(boardKey);

  if (isWinner(board, PLAYER_X) || isWinner(board, PLAYER_O) || isBoardFull(board)) return;

  const currentPlayer = nextPlayer(board);
  for (const move of getAvailableMoves(board)) {
    board[move] = currentPlayer;
    generateAllBoards(board, boardsSet);
    board[move] = EMPTY;
  }
}

export async function createTrainingData() {
  const boardsSet = new Set<string>();
  const initialBoard = Array(9).fill(EMPTY);

  // Generate all unique legal board states
  generateAllBoards(initialBoard, boardsSet);

  const records = [];

  // Process each board state
  for (const boardKey of boardsSet) {
    const board = boardKey.split('') as string[];
    if (isWinner(board, PLAYER_X) || isWinner(board, PLAYER_O) || isBoardFull(board)) continue;

    const optimalMoves = findBestMoves(board);
    const boardNumeric = board.map(cell => (cell === PLAYER_X ? 1 : cell === PLAYER_O ? -1 : 0));
    const optimalMovesStr = optimalMoves.join(',');

    records.push({
      Cell_0: boardNumeric[0],
      Cell_1: boardNumeric[1],
      Cell_2: boardNumeric[2],
      Cell_3: boardNumeric[3],
      Cell_4: boardNumeric[4],
      Cell_5: boardNumeric[5],
      Cell_6: boardNumeric[6],
      Cell_7: boardNumeric[7],
      Cell_8: boardNumeric[8],
      Optimal_Moves: optimalMovesStr
    });
  }

  await writer.writeRecords(records);
  console.log('Dataset generated and saved to tic_tac_toe_dataset.csv');
}

// main();
