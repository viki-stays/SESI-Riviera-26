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
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      if (message.type === 'INIT' || message.type === 'UPDATE') {
        setGameState(message.state);
      } else if (message.type === 'VAULT_OPENED') {
        // Vault opened animation handled by state update
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
    setInputCode('');
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

          {gameState.isStarted && (
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
        </header>

        <main>
          {!gameState.isStarted ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto text-center py-20"
            >
              <h2 className="text-5xl font-bold mb-6 tracking-tight">MISSION SETUP</h2>
              <p className="text-white/60 mb-12 leading-relaxed">
                Welcome, operatives. You are about to attempt the most sophisticated digital heist in history. 
                Coordinate with your fellow teams to bypass the triple-layer security grid.
              </p>
              
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl mb-8">
                <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-4">Number of Active Teams</label>
                <div className="flex justify-center gap-4">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setTeamCount(n)}
                      className={`w-16 h-16 rounded-xl font-bold text-xl transition-all border ${
                        teamCount === n ? 'bg-orange-500 border-orange-400 text-black' : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startGame}
                className="group relative w-full py-5 bg-white text-black font-bold text-xl rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="absolute inset-0 bg-orange-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  INITIATE HEIST <ChevronRight className="w-6 h-6" />
                </span>
              </button>
            </motion.div>
          ) : gameState.isVaultOpen ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="inline-block p-6 bg-emerald-500/20 rounded-full mb-8 border border-emerald-500/40 animate-pulse">
                <Unlock className="w-24 h-24 text-emerald-500" />
              </div>
              <h2 className="text-7xl font-bold mb-4 tracking-tighter uppercase italic text-emerald-500">Vault Breached</h2>
              <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
                All security layers have been bypassed. The assets are ours. 
                Extraction team is 2 minutes out.
              </p>
              
              <div className="flex justify-center gap-6 mb-12">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                  <div className="text-xs font-mono text-white/40 uppercase mb-1">Total Time</div>
                  <div className="text-3xl font-bold text-orange-500">
                    {Math.floor((Date.now() - (gameState.startTime || 0)) / 60000)}m {Math.floor(((Date.now() - (gameState.startTime || 0)) % 60000) / 1000)}s
                  </div>
                </div>
              </div>

              <button
                onClick={resetGame}
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 mx-auto"
              >
                <RefreshCcw className="w-5 h-5" /> RESET SYSTEM
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Puzzles */}
              <div className="lg:col-span-7 space-y-6">
                {!selectedTeamId ? (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-12 text-center">
                    <Users className="w-16 h-16 text-white/20 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Select Your Team</h3>
                    <p className="text-white/40">Choose your team number from the top to view your assigned puzzles.</p>
                  </div>
                ) : (
                  <motion.div
                    key={selectedTeamId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <span className="text-orange-500">TEAM {selectedTeamId}</span> ASSIGNMENT
                      </h3>
                      {selectedTeam?.isSolved && (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-mono rounded-full border border-emerald-500/40">
                          LAYER BYPASSED
                        </span>
                      )}
                    </div>

                    {selectedTeam?.puzzles.map((puzzle, idx) => (
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
                    ))}
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
                {selectedTeamId && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl"
                  >
                    <div className="text-center mb-8">
                      <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4">Enter Team {selectedTeamId} Code</div>
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
                          disabled={selectedTeam?.isSolved}
                          className="h-16 rounded-xl bg-white/5 border border-white/10 text-xl font-bold hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={clearInput}
                        disabled={selectedTeam?.isSolved}
                        className="h-16 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        CLR
                      </button>
                      <button
                        onClick={() => handleKeypadClick('0')}
                        disabled={selectedTeam?.isSolved}
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

                    {selectedTeam?.isSolved && (
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
