// import { createTrainingData } from './createTrainingData';
import { trainModel } from "./train-model";

// Main function to orchestrate the entire data create and train.
async function main() {
  //First, generate the dataset using the Minimax algorithm. https://en.wikipedia.org/wiki/Minimax
  // console.log('Generating training data using Minimax...');
  // await createTrainingData(); // training data is already generated.
  console.log("Training the model");
  await trainModel();
}

main();
