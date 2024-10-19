// import { createTrainingData } from './createTrainingData';
import { trainModel } from "./train-model";

// Main function to orchestrate the entire data create and train.
async function main() {
  //First, generate the dataset using the Minimax algorithm. https://en.wikipedia.org/wiki/Minimax
  // console.log('Generating training data using Minimax...');
  // await createTrainingData(); // training data is already generated.
  console.log("Training the model");
  // @todo check for training to do forward and backward propagation.
  await trainModel();
}

main();

// apply techniques from below.
// Both “supervised” and “unsupervised.” Autoencoders are seen as “unsupervised” or “self-supervised.” This is primarily because they do not use labels. Some call autoencoders self-supervised. Others say the learning is unsupervised but the inference is supervised. Most however will put autoencoder into the unsupervised learning space.
// Data Preparation: We started with a set of images from celebrities. This was our data. We now build a model that is trying to learn to compress (encode) the data and then reconstruct (decode) it back to its original form. The autoencoder is good if the output image resembles the output image.
// Encoder: The encoder part of the autoencoder is a neural network that learns to compress the input data into a lower-dimensional representation, often called a latent space. You might point now out that the word “beach” is compressed representation. True! But it’s a label. We all agreed on what “beach” should mean. Here, we are not looking for a defined label. The computer is free to store the image in a compressed form as it likes as long (!) as it can decode it again. Essentially, the encoder finds by itself, e.g., unsupervised, the best representation of the image.
// Decoder: The decoder part of the autoencoder is another neural network that reconstructs the original data from the compressed representation (latent space) provided by the encoder. While we might not care about intermediate decompressed states, we do care about the final decoded output, which should closely resemble the original input data.
// Training Process: During training, the autoencoder is fed input data, which passes through the encoder to produce a compressed representation. This compressed representation is then passed through the decoder to reconstruct the original data. The difference between the original input data and the reconstructed data is calculated using a loss function, typically mean squared error.
// Loss Minimization: The goal of training is to minimize this reconstruction loss. By backpropagating the loss through the network, the encoder and decoder weights are adjusted to improve the quality of the reconstruction. Although the training process itself is unsupervised because it doesn't require labeled data, the optimization process involves backpropagation and gradient descent, which are typically associated with supervised learning. Moreover, while we do not have a “true-north” like a label, we do know that we want to “resemble” the output image. That is a kind of supervision.
