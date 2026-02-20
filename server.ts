import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { GameState, ClientMessage, ServerMessage } from "./src/types";
import { INITIAL_TEAMS } from "./src/constants";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  let gameState: GameState = {
    isStarted: false,
    isVaultOpen: false,
    teams: [],
    startTime: null,
  };

  function broadcast(message: ServerMessage) {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  wss.on("connection", (ws) => {
    // Send initial state to new client
    ws.send(JSON.stringify({ type: "INIT", state: gameState }));

    ws.on("message", (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "START_GAME":
            gameState = {
              isStarted: true,
              isVaultOpen: false,
              teams: INITIAL_TEAMS(message.teamCount),
              startTime: Date.now(),
            };
            broadcast({ type: "UPDATE", state: gameState });
            break;

          case "SUBMIT_CODE":
            const team = gameState.teams.find((t) => t.id === message.teamId);
            if (team) {
              team.enteredCode = message.code;
              team.isSolved = team.enteredCode === team.code;
              
              // Check if all teams solved
              const allSolved = gameState.teams.every((t) => t.isSolved);
              if (allSolved) {
                gameState.isVaultOpen = true;
                broadcast({ type: "VAULT_OPENED" });
              }
              
              broadcast({ type: "UPDATE", state: gameState });
            }
            break;

          case "RESET_GAME":
            gameState = {
              isStarted: false,
              isVaultOpen: false,
              teams: [],
              startTime: null,
            };
            broadcast({ type: "UPDATE", state: gameState });
            break;
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
