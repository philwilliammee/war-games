# War Games

for fun!

## Usage

```bash
npm install
npm run dev
```

Requires **Ollama** and **Llama 3.1** to be running or **AWS Bedrock** (see environment variables below).

Uses **Web Containers** to execute commands in the sandboxed browser Node.js environment.

Example usage: `run ls command and describe folder contents.`

Example output:

```txt
The output of the ls command shows two files:

- index.js
- package.json

This suggests that the current directory contains a small Node.js project with an entry point in index.js and metadata in package.json.
```

## .env Configuration

Before running the project, you need to set up environment variables.

1. **Create a `.env` file** in the root of your project by copying the example file:

    ```bash
    cp env.example .env
    ```

2. **Fill in the required values** in the `.env` file:

    ```bash
    # Available platform options `ollama` or `bedrock`
    VITE_PLATFORM='ollama'
    VITE_MODEL='llama3.1'

    # AWS Credentials (if using Bedrock)
    VITE_AWS_ACCESS_KEY_ID=your_aws_access_key_id
    VITE_AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
    VITE_AWS_SESSION_TOKEN=your_aws_session_token
    VITE_AWS_REGION="us-east-1"
    ```

### Explanation of `.env` Variables

- **VITE_PLATFORM**: Choose between `ollama` or `bedrock` to set the platform for the project.
- **VITE_MODEL**: Defines the model used, such as `llama3.1`.
- **VITE_AWS_ACCESS_KEY_ID**, **VITE_AWS_SECRET_ACCESS_KEY**, **VITE_AWS_SESSION_TOKEN**, **VITE_AWS_REGION**: These are required if you're using the Bedrock platform and must be filled in with your AWS credentials and region.

### Important Notes

- The **AWS credentials** should only be provided if you are using the **Bedrock** platform. For **Ollama**, AWS credentials are not required.
- Be cautious not to expose sensitive credentials in your frontend.

## Tic-Tac-Toe Game Instructions

To run the Tic-Tac-Toe game in the web terminal:

```bash
npm i && npm start
```

This will install the necessary dependencies and start the Tic-Tac-Toe game in your terminal.

Then in the input tell the AI to make a move by typing `Lets play tic-tac-toe, you go first select a position on the board.`.

after each move update the input and let the AI know it is their turn by typing `I have made my move to position <0-8>, its your turn select a position on the board.`.

generate example headings one through 6

lets explore the index.html space slowly increase the complexity of the command until we get errors.
