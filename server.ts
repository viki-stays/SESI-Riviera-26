import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import path from "path";
import fs from "fs";
import { GameState, ClientMessage, ServerMessage } from "./src/types";
import { INITIAL_TEAMS } from "./src/constants";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

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

          case "CLAIM_TEAM":
            const teamToClaim = gameState.teams.find(t => t.id === message.teamId);
            if (teamToClaim && !teamToClaim.isClaimed) {
              teamToClaim.isClaimed = true;
              teamToClaim.claimedBy = message.clientId;
              broadcast({ type: "UPDATE", state: gameState });
            }
            break;

          case "UPDATE_TEAM_NAME":
            const teamToRename = gameState.teams.find(t => t.id === message.teamId);
            if (teamToRename) {
              teamToRename.name = message.name;
              broadcast({ type: "UPDATE", state: gameState });
            }
            break;

          case "UPDATE_PUZZLE":
            const teamWithPuzzle = gameState.teams.find(t => t.id === message.teamId);
            if (teamWithPuzzle) {
              const puzzle = teamWithPuzzle.puzzles.find(p => p.id === message.puzzleId);
              if (puzzle) {
                (puzzle as any)[message.field] = message.value;
                // Recalculate code if answer changed
                if (message.field === 'answer') {
                  teamWithPuzzle.code = teamWithPuzzle.puzzles.map(p => p.answer).join('');
                }
                broadcast({ type: "UPDATE", state: gameState });
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
              broadcast({ type: "UPDATE", state: gameState });
            }
            break;

          case "REMOVE_TEAM":
            gameState.teams = gameState.teams.filter(t => t.id !== message.teamId);
            broadcast({ type: "UPDATE", state: gameState });
            break;

          case "START_TEAM":
            const teamToStart = gameState.teams.find(t => t.id === message.teamId);
            if (teamToStart && !teamToStart.startTime) {
              teamToStart.startTime = Date.now();
              broadcast({ type: "UPDATE", state: gameState });
            }
            break;

          case "SUBMIT_CODE":
            const team = gameState.teams.find((t) => t.id === message.teamId);
            if (team) {
              team.enteredCode = message.code;
              const wasSolved = team.isSolved;
              team.isSolved = team.enteredCode === team.code;
              
              if (team.isSolved && !wasSolved) {
                team.solveTime = Date.now();
              }

              // Check if all teams solved
              const allSolved = gameState.teams.length > 0 && gameState.teams.every((t) => t.isSolved);
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
  const isProd = process.env.NODE_ENV === "production";
  const distPath = path.resolve("dist");
  const hasDist = fs.existsSync(distPath);

  if (isProd && hasDist) {
    console.log("Serving production build from dist...");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    console.log("Starting development server with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
