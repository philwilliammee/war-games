// @ts-nocheck
import express from "express";
import path from "path-browserify";

const app = express();
const port = 3111;

// Serve static files from Angular's dist folder
const distPath = path.join(process.cwd(), "dist", "client", "browser");
app.use(express.static(distPath));

// Serve index.html for all routes (Angular's single-page application fallback)
app.all("/*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log("Server is live at http://localhost:" + port);
});
