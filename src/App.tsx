import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Unlock, 
  Users, 
  Puzzle as PuzzleIcon, 
  Zap, 
  Eye, 
  Move, 
  ChevronRight, 
  RefreshCcw,
  Trophy,
  AlertCircle,
  Clock
} from 'lucide-react';
import { GameState, ServerMessage, ClientMessage, TeamData } from './types';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState(4);
  const [inputCode, setInputCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState(false);
  const [clientId] = useState(() => {
    const saved = localStorage.getItem('vault_client_id');
    if (saved) return saved;
    const id = Math.random().toString(36).substring(7);
    localStorage.setItem('vault_client_id', id);
    return id;
  });
  const [claimedTeamId, setClaimedTeamId] = useState<number | null>(() => {
    const saved = localStorage.getItem('vault_claimed_team');
    return saved ? parseInt(saved) : null;
  });
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') === 'host') setIsHost(true);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      if (message.type === 'INIT' || message.type === 'UPDATE') {
        setGameState(message.state);
      }
    };

    return () => socket.close();
  }, []);

  const startGame = () => {
    socketRef.current?.send(JSON.stringify({ type: 'START_GAME', teamCount }));
  };

  const resetGame = () => {
    socketRef.current?.send(JSON.stringify({ type: 'RESET_GAME' }));
    setSelectedTeamId(null);
    setClaimedTeamId(null);
    localStorage.removeItem('vault_claimed_team');
    setInputCode('');
  };

  const joinRoom = () => {
    if (joinCode.toUpperCase() === gameState?.roomCode) {
      setHasJoined(true);
      setJoinError(false);
    } else {
      setJoinError(true);
      setTimeout(() => setJoinError(false), 1000);
    }
  };

  const claimTeam = (teamId: number) => {
    socketRef.current?.send(JSON.stringify({ type: 'CLAIM_TEAM', teamId, clientId }));
    setClaimedTeamId(teamId);
    setSelectedTeamId(teamId);
    localStorage.setItem('vault_claimed_team', teamId.toString());
  };

  const updateTeamName = (teamId: number, name: string) => {
    socketRef.current?.send(JSON.stringify({ type: 'UPDATE_TEAM_NAME', teamId, name }));
  };

  const updatePuzzle = (teamId: number, puzzleId: string, field: string, value: string) => {
    socketRef.current?.send(JSON.stringify({ type: 'UPDATE_PUZZLE', teamId, puzzleId, field, value }));
  };

  const addTeam = () => {
    socketRef.current?.send(JSON.stringify({ type: 'ADD_TEAM' }));
  };

  const removeTeam = (teamId: number) => {
    socketRef.current?.send(JSON.stringify({ type: 'REMOVE_TEAM', teamId }));
  };

  const startTeam = (teamId: number) => {
    socketRef.current?.send(JSON.stringify({ type: 'START_TEAM', teamId }));
  };

  const downloadReport = () => {
    if (!gameState) return;
    const headers = ['Team ID', 'Team Name', 'Start Time', 'Solve Time', 'Duration (s)'];
    const rows = gameState.teams.map(t => {
      const duration = t.solveTime && t.startTime ? (t.solveTime - t.startTime) / 1000 : 'N/A';
      return [
        t.id,
        t.name,
        t.startTime ? new Date(t.startTime).toLocaleTimeString() : 'N/A',
        t.solveTime ? new Date(t.solveTime).toLocaleTimeString() : 'N/A',
        duration
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vault_breach_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submitCode = (code: string) => {
    if (!selectedTeamId) return;
    socketRef.current?.send(JSON.stringify({ type: 'SUBMIT_CODE', teamId: selectedTeamId, code }));
  };

  const handleKeypadClick = (num: string) => {
    if (inputCode.length < 3) {
      const newCode = inputCode + num;
      setInputCode(newCode);
      if (newCode.length === 3) {
        submitCode(newCode);
      }
    }
  };

  const clearInput = () => setInputCode('');

  if (!gameState) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="animate-pulse text-gold-500 font-mono">INITIALIZING VAULT CONNECTION...</div>
    </div>
  );

  if (!hasJoined && !isHost) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl text-center"
      >
        <div className="mb-8">
          <div className="inline-block p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 mb-4">
            <Lock className="w-12 h-12 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase italic mb-2">Access Portal</h1>
          <p className="text-white/40 text-sm">Enter the secure room code to join the heist.</p>
        </div>

        <div className="space-y-4">
          <input 
            type="text" 
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            className={`w-full bg-black/50 border ${joinError ? 'border-red-500 animate-shake' : 'border-white/10'} rounded-xl px-6 py-4 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-orange-500 transition-all`}
          />
          <button 
            onClick={joinRoom}
            className="w-full py-4 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-400 active:scale-95 transition-all"
          >
            JOIN HEIST
          </button>
          <button 
            onClick={() => setIsHost(true)}
            className="text-white/20 text-xs uppercase tracking-widest hover:text-white/40 transition-colors"
          >
            Host a new session
          </button>
        </div>
      </motion.div>
    </div>
  );

  const selectedTeam = gameState.teams.find(t => t.id === selectedTeamId);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tighter uppercase italic">The Vault</h1>
              <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Secure Multi-Team Access System</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {isHost && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-right">
                  <div className="text-[10px] font-mono text-white/40 uppercase">Room Code</div>
                  <div className="text-lg font-bold text-orange-500 tracking-widest">{gameState.roomCode}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-right">
                  <div className="text-[10px] font-mono text-white/40 uppercase">Agents</div>
                  <div className="text-lg font-bold text-white">{gameState.connectedPlayers}</div>
                </div>
              </div>
            )}

            {gameState.isStarted && !isHost && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 max-w-full">
                {gameState.teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setInputCode(team.enteredCode);
                    }}
                    className={`px-4 py-2 rounded-lg font-mono text-sm transition-all border ${
                      selectedTeamId === team.id 
                        ? 'bg-orange-500 border-orange-400 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                        : team.isSolved 
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    TEAM {team.id}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <main>
          {!gameState.isStarted ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto text-center py-12"
            >
              <div className="mb-12">
                <h2 className="text-5xl font-bold mb-6 tracking-tight">HEIST LOBBY</h2>
                <p className="text-white/60 leading-relaxed">
                  {isHost 
                    ? "Game Master, prepare the mission. Share the room code with your agents and initiate the heist when all teams are ready."
                    : "Waiting for the Game Master to initiate the heist. Coordinate with your team and prepare for extraction."}
                </p>
              </div>

              {isHost ? (
                <div className="space-y-8">
                  <div className="bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-xl">
                    <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-6">Mission Configuration</div>
                    <div className="flex flex-col items-center gap-8">
                      <div className="space-y-4 w-full">
                        <label className="block text-xs font-mono text-white/40 uppercase tracking-widest">Number of Active Teams</label>
                        <div className="flex flex-wrap justify-center gap-2">
                          {[2, 4, 6, 8, 10, 12, 14, 16].map(n => (
                            <button
                              key={n}
                              onClick={() => setTeamCount(n)}
                              className={`w-14 h-14 rounded-xl font-bold text-lg transition-all border ${
                                teamCount === n ? 'bg-orange-500 border-orange-400 text-black shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="w-full p-6 bg-black/30 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-white/40">CONNECTED AGENTS</span>
                          <span className="text-orange-500 font-bold">{gameState.connectedPlayers}</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (gameState.connectedPlayers / 10) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={startGame}
                    className="group relative w-full py-6 bg-white text-black font-bold text-2xl rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-2xl"
                  >
                    <div className="absolute inset-0 bg-orange-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative z-10 flex items-center justify-center gap-3 tracking-tighter">
                      INITIATE MISSION <ChevronRight className="w-8 h-8" />
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-8">
                  <div className="relative">
                    <div className="w-32 h-32 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Users className="w-10 h-10 text-orange-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-xs font-mono text-white/40 uppercase tracking-[0.3em]">Awaiting Command...</div>
                </div>
              )}
            </motion.div>
          ) : gameState.isVaultOpen ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
            >
              {/* Dramatic Background Effects */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 10, repeat: Infinity }}
                className="absolute inset-0 opacity-20"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/20 via-transparent to-orange-500/20" />
              </motion.div>

              {/* Confetti-like particles */}
              {Array.from({ length: 50 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: Math.random() * window.innerWidth, 
                    y: -20,
                    rotate: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    y: window.innerHeight + 20,
                    rotate: 360,
                    opacity: 0
                  }}
                  transition={{ 
                    duration: Math.random() * 3 + 2, 
                    repeat: Infinity,
                    delay: Math.random() * 5
                  }}
                  className={`absolute w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                />
              ))}

              <div className="relative z-10 text-center px-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                  className="inline-block p-10 bg-emerald-500 rounded-full mb-12 shadow-[0_0_100px_rgba(16,185,129,0.5)]"
                >
                  <Unlock className="w-32 h-32 text-black" />
                </motion.div>

                <motion.h2 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-8xl font-black mb-6 tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-500"
                >
                  Vault Breached
                </motion.h2>

                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl text-white/60 mb-16 max-w-3xl mx-auto font-light tracking-wide"
                >
                  The digital fortress has fallen. All assets secured. 
                  Extraction protocols initiated.
                </motion.p>
                
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col md:flex-row justify-center gap-8 mb-16"
                >
                  <div className="bg-white/5 border border-white/10 px-12 py-8 rounded-3xl backdrop-blur-xl">
                    <div className="text-xs font-mono text-white/40 uppercase mb-2 tracking-widest">Mission Duration</div>
                    <div className="text-5xl font-bold text-emerald-500">
                      {Math.floor((Date.now() - (gameState.startTime || 0)) / 60000)}:
                      {String(Math.floor(((Date.now() - (gameState.startTime || 0)) % 60000) / 1000)).padStart(2, '0')}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 px-12 py-8 rounded-3xl backdrop-blur-xl">
                    <div className="text-xs font-mono text-white/40 uppercase mb-2 tracking-widest">Security Level</div>
                    <div className="text-5xl font-bold text-orange-500">CRACKED</div>
                  </div>
                </motion.div>

                {isHost && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    onClick={resetGame}
                    className="px-12 py-5 bg-white text-black font-bold rounded-2xl hover:bg-emerald-500 transition-all flex items-center gap-3 mx-auto shadow-2xl"
                  >
                    <RefreshCcw className="w-6 h-6" /> RESET SYSTEM FOR NEXT HEIST
                  </motion.button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Puzzles */}
              <div className="lg:col-span-7 space-y-6">
                {isHost ? (
                  <div className="space-y-8">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 h-full">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Users className="w-6 h-6 text-orange-500" /> MISSION OVERVIEW
                      </h3>
                      <div className="flex gap-4">
                        <button 
                          onClick={resetGame}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-2"
                        >
                          <RefreshCcw className="w-4 h-4" /> RESET GAME
                        </button>
                        <button 
                          onClick={downloadReport}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-mono hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                          <ChevronRight className="w-4 h-4 rotate-90" /> EXPORT REPORT
                        </button>
                        <button 
                          onClick={addTeam}
                          className="px-4 py-2 bg-orange-500 text-black rounded-lg text-xs font-bold hover:bg-orange-400 transition-all"
                        >
                          + ADD TEAM
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {gameState.teams.map(team => (
                        <div key={team.id} className="p-6 bg-black/30 border border-white/5 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-lg font-bold">TEAM {team.id}</div>
                              <input 
                                type="text"
                                value={team.name}
                                onChange={(e) => updateTeamName(team.id, e.target.value)}
                                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-orange-500"
                              />
                            </div>
                            <button 
                              onClick={() => removeTeam(team.id)}
                              className="text-red-500 hover:text-red-400 transition-colors"
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {team.puzzles.map(puzzle => (
                              <div key={puzzle.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase">
                                  <span>{puzzle.type}</span>
                                  <input 
                                    type="text"
                                    value={puzzle.answer}
                                    onChange={(e) => updatePuzzle(team.id, puzzle.id, 'answer', e.target.value)}
                                    className="w-8 bg-black/50 border border-white/10 rounded text-center text-orange-500 focus:outline-none focus:border-orange-500"
                                  />
                                </div>
                                <textarea 
                                  value={puzzle.question}
                                  onChange={(e) => updatePuzzle(team.id, puzzle.id, 'question', e.target.value)}
                                  className="w-full bg-transparent border-none text-xs text-white/60 focus:outline-none resize-none h-12"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <div className="text-[10px] font-mono text-white/40">
                              {team.isSolved ? (
                                <span className="text-emerald-500">BREACHED IN {Math.floor((team.solveTime! - team.startTime!) / 1000)}s</span>
                              ) : (
                                <span>PROGRESS: {team.enteredCode.length}/3</span>
                              )}
                            </div>
                            {team.isClaimed ? (
                              <div className="text-[10px] font-mono text-blue-400 uppercase">AGENT ACTIVE</div>
                            ) : (
                              <div className="text-[10px] font-mono text-white/20 uppercase">AWAITING AGENT</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                ) : !claimedTeamId ? (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 h-full">
                    <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                      <Users className="w-6 h-6 text-orange-500" /> SELECT YOUR TEAM
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gameState.teams.map(team => (
                        <button
                          key={team.id}
                          disabled={team.isClaimed}
                          onClick={() => claimTeam(team.id)}
                          className={`p-6 rounded-2xl border text-left transition-all ${
                            team.isClaimed 
                              ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-orange-500/50 group'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-lg font-bold group-hover:text-orange-500 transition-colors">{team.name}</span>
                            {team.isClaimed ? (
                              <span className="text-[10px] font-mono text-white/20 uppercase">OCCUPIED</span>
                            ) : (
                              <span className="text-[10px] font-mono text-emerald-500 uppercase">AVAILABLE</span>
                            )}
                          </div>
                          <div className="text-xs text-white/40">Layer {team.id} Security Protocol</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <motion.div
                    key={claimedTeamId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                          <input 
                            type="text"
                            value={gameState.teams.find(t => t.id === claimedTeamId)?.name || ''}
                            onChange={(e) => updateTeamName(claimedTeamId, e.target.value)}
                            className="bg-transparent border-b border-white/10 focus:border-orange-500 focus:outline-none transition-colors"
                          />
                        </h3>
                        <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-500 text-xs font-mono">
                          {(() => {
                            const team = gameState.teams.find(t => t.id === claimedTeamId);
                            if (!team || !team.startTime) return '00:00';
                            const now = team.solveTime || Date.now();
                            const diff = Math.max(0, Math.floor((now - team.startTime) / 1000));
                            const m = Math.floor(diff / 60);
                            const s = diff % 60;
                            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                          })()}
                        </div>
                      </div>
                      {gameState.teams.find(t => t.id === claimedTeamId)?.isSolved && (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-mono rounded-full border border-emerald-500/40">
                          LAYER BYPASSED
                        </span>
                      )}
                    </div>

                    {(() => {
                      const team = gameState.teams.find(t => t.id === claimedTeamId);
                      if (!team) return null;
                      
                      if (!team.startTime) {
                        return (
                          <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                            <Zap className="w-16 h-16 text-orange-500 mb-6 animate-pulse" />
                            <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter">Ready to Breach?</h3>
                            <p className="text-white/40 mb-8 max-w-xs text-center">Once you start, your team's timer will begin and security protocols will be revealed.</p>
                            <button 
                              onClick={() => startTeam(claimedTeamId)}
                              className="px-12 py-4 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-400 transition-all active:scale-95 shadow-[0_0_30px_rgba(249,115,22,0.3)]"
                            >
                              START MISSION
                            </button>
                          </div>
                        );
                      }

                      return team.puzzles.map((puzzle, idx) => (
                        <div 
                          key={puzzle.id}
                          className="bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-hidden group"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50 group-hover:bg-orange-500 transition-colors" />
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/5 rounded-xl text-orange-500">
                              {puzzle.type === 'logic' && <Zap className="w-6 h-6" />}
                              {puzzle.type === 'visual' && <Eye className="w-6 h-6" />}
                              {puzzle.type === 'physical' && <Move className="w-6 h-6" />}
                            </div>
                            <div>
                              <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">
                                Puzzle {idx + 1} • {puzzle.type}
                              </div>
                              <p className="text-lg leading-relaxed">{puzzle.question}</p>
                              <div className="mt-4 flex items-center gap-2 text-xs text-white/30 italic">
                                <AlertCircle className="w-3 h-3" /> {puzzle.hint}
                              </div>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </motion.div>
                )}
              </div>

              {/* Right Column: Keypad & Status */}
              <div className="lg:col-span-5 space-y-8">
                {/* Global Vault Status */}
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                  <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Vault Access Status
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {gameState.teams.map(team => (
                      <div 
                        key={team.id}
                        className={`p-4 rounded-xl border transition-all ${
                          team.isSolved 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono">TEAM {team.id}</span>
                          {team.isSolved ? <Unlock className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3 text-white/20" />}
                        </div>
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div 
                              key={i} 
                              className={`h-1.5 flex-1 rounded-full ${
                                team.isSolved 
                                  ? 'bg-emerald-500' 
                                  : team.enteredCode.length > i 
                                    ? 'bg-orange-500' 
                                    : 'bg-white/10'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Keypad */}
                {!isHost && claimedTeamId && gameState.teams.find(t => t.id === claimedTeamId)?.startTime && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl"
                  >
                    <div className="text-center mb-8">
                      <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4">Enter {gameState.teams.find(t => t.id === claimedTeamId)?.name} Code</div>
                      <div className="flex justify-center gap-4">
                        {[0, 1, 2].map(i => (
                          <div 
                            key={i}
                            className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-3xl font-bold font-mono transition-all ${
                              inputCode[i] 
                                ? 'border-orange-500 text-orange-500 bg-orange-500/10' 
                                : 'border-white/10 text-white/10'
                            }`}
                          >
                            {inputCode[i] || '•'}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button
                          key={n}
                          onClick={() => handleKeypadClick(n.toString())}
                          disabled={gameState.teams.find(t => t.id === claimedTeamId)?.isSolved}
                          className="h-16 rounded-xl bg-white/5 border border-white/10 text-xl font-bold hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={clearInput}
                        disabled={gameState.teams.find(t => t.id === claimedTeamId)?.isSolved}
                        className="h-16 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        CLR
                      </button>
                      <button
                        onClick={() => handleKeypadClick('0')}
                        disabled={gameState.teams.find(t => t.id === claimedTeamId)?.isSolved}
                        className="h-16 rounded-xl bg-white/5 border border-white/10 text-xl font-bold hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                      >
                        0
                      </button>
                      <button
                        onClick={() => resetGame()}
                        className="h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                      >
                        <RefreshCcw className="w-6 h-6 text-white/40" />
                      </button>
                    </div>

                    {gameState.teams.find(t => t.id === claimedTeamId)?.isSolved && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-center font-bold flex items-center justify-center gap-2"
                      >
                        <Unlock className="w-5 h-5" /> ACCESS GRANTED
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Footer Info */}
        <footer className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-xs font-mono uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> System Uptime: 99.9%</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Encryption: AES-256</span>
          </div>
          <div>© 2026 Vault Security Systems Inc.</div>
        </footer>
      </div>
    </div>
  );
}
