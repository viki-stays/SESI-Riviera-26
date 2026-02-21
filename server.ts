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

  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  let gameState: GameState = {
    isStarted: false,
    isVaultOpen: false,
    teams: [],
    startTime: null,
    roomCode: generateRoomCode(),
    connectedPlayers: 0,
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
    gameState.connectedPlayers = wss.clients.size;
    broadcast({ type: "UPDATE", state: gameState });

    ws.on("message", (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "JOIN_ROOM":
            // In this simple version, we only have one room, 
            // but we validate the code for engagement.
            if (message.roomCode.toUpperCase() === gameState.roomCode) {
              ws.send(JSON.stringify({ type: "UPDATE", state: gameState }));
            }
            break;
          case "START_GAME":
            gameState = {
              ...gameState,
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
              ...gameState,
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

    ws.on("close", () => {
      gameState.connectedPlayers = wss.clients.size;
      broadcast({ type: "UPDATE", state: gameState });
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
