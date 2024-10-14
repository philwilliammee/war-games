import * as tf from "@tensorflow/tfjs";

/**
 * Function to load the model and predict the next move for a given board state
 *
 * @param board [[1, -1, 1,  # X O X
                 -1, 1, 0,  # O X (empty)
                 -1, 0, 0]]  # O (empty) (empty)
 */
export async function ticTacToeModelPredict(board: number[]): Promise<number> {
  // Load the model
  const model = await tf.loadLayersModel(
    "src/tic-tac-toe/tfjs_model/model/model.json"
  );

  // Print model summary
  // console.log(model.summary());

  // Convert the board to a 2D tensor with shape [1, 9] (batch size = 1)
  const inputTensor = tf.tensor2d([board], [1, 9]);

  // Get the prediction
  const prediction = model.predict(inputTensor) as tf.Tensor;

  // Get the index of the maximum value (the best move)
  const predictedMove = prediction.argMax(1).dataSync()[0];

  // Print the predicted move (cell index)
  console.log(`Predicted best move is at cell index: ${predictedMove}`);

  // If you want to print the probabilities as well
  // prediction.print();
  return predictedMove;
}
