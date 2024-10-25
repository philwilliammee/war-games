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

Example Web developer prompts Commands:

improve the UI and UX.

Display a help message on user input.

generate example headings one through 6

lets explore the index.html space increase the complexity of the command until we get errors.

lets update_file public/styles.css

now lets import it into our index.html file

looks great. Now lets create a UI input and display add a help command.

Update the CSS file to style our WOPR interface. This will give it a retro computer terminal look, with a dark background and green text.

Ok now add a input and handle the help command. The input fontsize should be 16px.

Create a single HTML file that simulates the WOPR interface from the movie War Games. The interface should have a retro computer look with a black background and green text. Include a header with the title "W.O.P.R." and subtitle "War Operation Plan Response". The main content area should display output messages and have an input field where users can type commands. Implement basic functionality for commands like "help", "games", and "login". The design should feature a CRT-like effect and a blinking cursor. Use inline CSS and JavaScript to keep everything in one file for easy implementation.

ok lets try something totally the opposite. Create a super modern UI use color gradients. Choose a dark them that is ultra modern. Think Nike, techware, warcore, 8k, ultra-hd, highly detailed futuristic.

Create a hyper-futuristic cyberpunk web interface set in the year 2424. The design should feature a dark background with neon colors, primarily cyan and magenta. Include glitch effects, holographic elements, and quantum-inspired animations. The layout should have a logo that says 'NEOX-2424' with a 3D glitch effect, a navigation menu with plasma-like buttons, and a hero section with a large glitchy 3D text saying 'Welcome to 2424'. Add three feature cards with holographic icons and plasma text describing advanced concepts like 'Quantum Consciousness', 'Nano-Molecular Reconstruction', and 'Time-Space Manipulation'. Use futuristic fonts, incorporate subtle background animations that suggest a quantum field, and ensure all interactive elements have sci-fi inspired hover effects. The overall aesthetic should evoke a sense of having transcended current technological limitations, blending humanity and advanced technology.

ok now do something very much for young children, fun, playful, bright colors, toys.

now what is something between the last two interfaces we created? Something that is fun and playful but also has a futuristic look.

Create a dark, futuristic web interface for a site called "Cyborg Nexus" that explores the fusion of human and machine. The design should feature a black background with neon blue accents, reminiscent of circuit boards and cybernetic enhancements. Include a header with a glowing logo and navigation menu, a hero section with a bold title about embracing cybernetic evolution, and three info cards highlighting aspects of human-machine integration like neural links and enhanced perception. Add an interactive section with a "Cybernetic Thought Generator" that displays random thoughts about the merging of biology and technology when clicked. The overall aesthetic should blend elements of cyberpunk, transhumanism, and introspective themes, creating an atmosphere of both technological advancement and existential contemplation. Use futuristic fonts, subtle circuit-like patterns in the background, and glowing effects to enhance the cyborg theme.

## simplified instructions

create a very simple html page at public/index.html

ok now make it more eleborate import the styles.css and index.js update the html to have a button the index.js should prevent default on the button, and show an alert message.

ok now add the index.js handler.

Ok now be more creative lets test the capabilities of the your control over the system. Work incrementally let make another incremental change.
