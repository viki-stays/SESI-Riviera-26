import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import path from "path";
import { GameState, ClientMessage, ServerMessage } from "./src/types";
import { INITIAL_TEAMS } from "./src/constants";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Global Game State - This lives on the server and is shared by ALL devices
  let gameState: GameState = {
    isStarted: false,
    isVaultOpen: false,
    teams: [],
    startTime: null,
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
    
    // Send current game state to the newly connected device
    ws.send(JSON.stringify({ type: "INIT", state: gameState }));
    broadcast({ type: "UPDATE", state: gameState });

    ws.on("message", (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "START_GAME":
            gameState.isStarted = true;
            gameState.isVaultOpen = false;
            gameState.teams = INITIAL_TEAMS(message.teamCount);
            gameState.startTime = Date.now();
            break;

          case "SUBMIT_CODE":
            const team = gameState.teams.find((t) => t.id === message.teamId);
            if (team) {
              team.enteredCode = message.code;
              if (message.code === team.code) {
                team.isSolved = true;
                team.solveTime = Date.now();
              }
              
              const allSolved = gameState.teams.length > 0 && gameState.teams.every(t => t.isSolved);
              if (allSolved) {
                gameState.isVaultOpen = true;
              }
            }
            break;

          case "RESET_GAME":
            gameState.isStarted = false;
            gameState.isVaultOpen = false;
            gameState.teams = [];
            gameState.startTime = null;
            break;

          case "CLAIM_TEAM":
            const teamToClaim = gameState.teams.find((t) => t.id === message.teamId);
            if (teamToClaim) {
              teamToClaim.isClaimed = true;
              teamToClaim.claimedBy = message.clientId;
            }
            break;

          case "UPDATE_TEAM_NAME":
            const teamToRename = gameState.teams.find((t) => t.id === message.teamId);
            if (teamToRename) {
              teamToRename.name = message.name;
            }
            break;

          case "UPDATE_PUZZLE":
            const teamWithPuzzle = gameState.teams.find((t) => t.id === message.teamId);
            if (teamWithPuzzle) {
              const puzzle = teamWithPuzzle.puzzles.find(p => p.id === message.puzzleId);
              if (puzzle) {
                (puzzle as any)[message.field] = message.value;
                if (message.field === 'answer') {
                  teamWithPuzzle.code = teamWithPuzzle.puzzles.map(p => p.answer).join('');
                }
              }
            }
            break;

          case "ADD_TEAM":
            if (gameState.teams.length < 16) {
              const newId = gameState.teams.length > 0 ? Math.max(...gameState.teams.map(t => t.id)) + 1 : 1;
              const newTeam = INITIAL_TEAMS(1)[0];
              newTeam.id = newId;
              newTeam.name = `Team ${newId}`;
              gameState.teams.push(newTeam);
            }
            break;

          case "REMOVE_TEAM":
            gameState.teams = gameState.teams.filter(t => t.id !== message.teamId);
            break;

          case "START_TEAM":
            const teamToStart = gameState.teams.find(t => t.id === message.teamId);
            if (teamToStart && !teamToStart.startTime) {
              teamToStart.startTime = Date.now();
            }
            break;
        }

        // Broadcast the updated state to ALL connected devices
        broadcast({ type: "UPDATE", state: gameState });
      } catch (e) {
        console.error("Error processing message:", e);
      }
    });

    ws.on("close", () => {
      gameState.connectedPlayers = wss.clients.size;
      broadcast({ type: "UPDATE", state: gameState });
    });
  });

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve("dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
