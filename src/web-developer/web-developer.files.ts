export const files = {
  "index.js": {
    file: {
      contents: /*js*/ `
import express from 'express';
import { posix as path } from 'path';

const app = express();
const port = 3111;

// Serve static files from the 'public' directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(\`Server is live at http://localhost:\${port}\`);
});
`,
    },
  },
  "package.json": {
    file: {
      contents: `
{
  "name": "webDeveloper-server",
  "type": "module",
  "dependencies": {
    "express": "latest",
    "nodemon": "latest"
  },
  "scripts": {
    "start": "nodemon -e '*' --watch './' index.js"
  }
}`,
    },
  },
  public: {
    directory: {
      "index.html": {
        file: {
          contents: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Web Developer Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Hello, Coding Companion!</h1>
  <p>Please update this page as per the user's requests.</p>
</body>
</html>
`,
        },
      },
      "styles.css": {
        file: {
          contents: `
body {
  background-color: #f0f0f0;
  text-align: center;
  font-family: Arial, sans-serif;
  margin-top: 50px;
}
h1 {
  color: #333;
}
p {
  color: #666;
  font-size: 1.2em;
}
    `,
        },
      },
    },
  },
};
