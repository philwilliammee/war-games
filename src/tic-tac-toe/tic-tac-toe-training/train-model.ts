import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
const csv = require('csv-parser');

// Function to load and preprocess the dataset
async function loadDataset() {
  const datasetPath =
    './shuffled_tic_tac_toe_dataset.csv';

  const inputs: number[][] = [];
  const labels: number[][] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(datasetPath)
      .pipe(csv())
      .on('data', (row) => {
        const input = [
          Number(row['Cell_0']),
          Number(row['Cell_1']),
          Number(row['Cell_2']),
          Number(row['Cell_3']),
          Number(row['Cell_4']),
          Number(row['Cell_5']),
          Number(row['Cell_6']),
          Number(row['Cell_7']),
          Number(row['Cell_8']),
        ];

        const optimalMoves = row['Optimal_Moves'].split(',').map(Number);
        const label = Array(9).fill(0);
        label[optimalMoves[0]] = 1;

        inputs.push(input);
        labels.push(label);
      })
      .on('end', () => {
        const inputTensor = tf.tensor2d(inputs, [inputs.length, 9]);
        const labelTensor = tf.tensor2d(labels, [labels.length, 9]);

        resolve({ xs: inputTensor, ys: labelTensor });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Build and train the model
const model = tf.sequential();

// Adding more hidden layers to the model
model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [9] })); // First hidden layer
model.add(tf.layers.dense({ units: 64, activation: 'relu' })); // hidden layer
model.add(tf.layers.dense({ units: 64, activation: 'relu' })); // hidden layer
model.add(tf.layers.dense({ units: 32, activation: 'relu' })); // hidden layer
model.add(tf.layers.dense({ units: 16, activation: 'relu' })); // hidden layer
model.add(tf.layers.dense({ units: 9, activation: 'relu' })); // hidden layer

// Output layer
model.add(tf.layers.dense({ units: 9, activation: 'softmax' }));

// Compile the model
model.compile({
  optimizer: 'adam',
  loss: 'categoricalCrossentropy',
  metrics: ['accuracy'],
});

export async function trainModel() {
  const dataset = (await loadDataset()) as any;
  await model.fit(dataset.xs, dataset.ys, {
    epochs: 100,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(
          `Epoch ${epoch + 1}: Loss = ${logs.loss}, Accuracy = ${logs.acc}`
        );
      },
    },
  });
  console.log('Model training complete');

  await saveModel(model);
}

export async function saveModel(model: tf.LayersModel) {
  const currentwd = process.cwd();
  const savePath = `file://${currentwd}/model`;
  await model.save(savePath);
  console.log(`Model saved to: ${savePath}`);
}
