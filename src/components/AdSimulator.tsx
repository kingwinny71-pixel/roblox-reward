import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, CheckCircle2, ShieldAlert, X, HelpCircle, Trophy, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface AdSimulatorProps {
  username: string;
  onAdCompleted: (adType: string, earnedCoins: number) => void;
  onClose: () => void;
}

type AdFormat = 'video' | 'playable' | 'trivia';

interface TriviaQuestion {
  question: string;
  options: string[];
  correct: number;
}

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    question: "What is the default currency in Roblox?",
    options: ["Tix", "Robux", "RobloCoins", "Tickets"],
    correct: 1
  },
  {
    question: "What is the name of Roblox's physical/digital construction toy game?",
    options: ["Minecraft", "Roblox Studio", "Robux Maker", "Brick Builder"],
    correct: 1
  },
  {
    question: "Who is the co-founder and current CEO of Roblox?",
    options: ["David Baszucki (Builderman)", "Steve Jobs", "Mark Zuckerberg", "Gabe Newell"],
    correct: 0
  },
  {
    question: "In what year was Roblox officially released?",
    options: ["2004", "2006", "2009", "2012"],
    correct: 1
  },
  {
    question: "What was the precursor currency to Robux that was retired in 2016?",
    options: ["RobloBucks", "Gold", "Tickets (Tix)", "Credits"],
    correct: 2
  }
];

const AD_CAMPAIGNS = [
  {
    title: "Blox Fruits Legends",
    description: "Unleash your inner swordsman or fruit user! Train to be the strongest player ever.",
    color: "from-blue-600 to-indigo-900",
    tag: "Action RPG"
  },
  {
    title: "Adopt Me! Pet Haven",
    description: "Adopt cute pets, style your dream house, and explore the magical world of Adoption Island!",
    color: "from-pink-500 to-orange-400",
    tag: "Simulation"
  },
  {
    title: "BedWars: Season 12",
    description: "Gather resources, defend your bed, and destroy enemy beds in intense team-based PvP battles!",
    color: "from-red-600 to-amber-700",
    tag: "PvP Strategy"
  },
  {
    title: "Brookhaven RP",
    description: "Roleplay with friends in a vast 3D city! Drive cool cars, own beautiful homes, and live your best life.",
    color: "from-emerald-500 to-teal-800",
    tag: "Roleplay"
  }
];

export default function AdSimulator({ username, onAdCompleted, onClose }: AdSimulatorProps) {
  const [format, setFormat] = useState<AdFormat>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isMuted, setIsMuted] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(AD_CAMPAIGNS[0]);
  const [earnedCoins, setEarnedCoins] = useState(10);
  
  // Playable Game State
  const [score, setScore] = useState(0);
  const [coinPosition, setCoinPosition] = useState({ x: 50, y: 50 });
  
  // Trivia State
  const [triviaQuestion, setTriviaQuestion] = useState<TriviaQuestion>(TRIVIA_QUESTIONS[0]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [triviaAnsweredCorrectly, setTriviaAnsweredCorrectly] = useState<boolean | null>(null);

  // Ad completed state
  const [isCompleted, setIsCompleted] = useState(false);

  // Pick a random campaign and ad format on mount
  useEffect(() => {
    const randomCampaign = AD_CAMPAIGNS[Math.floor(Math.random() * AD_CAMPAIGNS.length)];
    setCurrentCampaign(randomCampaign);

    const formats: AdFormat[] = ['video', 'playable', 'trivia'];
    const randomFormat = formats[Math.floor(Math.random() * formats.length)];
    setFormat(randomFormat);

    if (randomFormat === 'trivia') {
      const randomTrivia = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
      setTriviaQuestion(randomTrivia);
    }

    // Generate random ad reward coins between 10 and 30 coins inclusive
    const coins = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
    setEarnedCoins(coins);
  }, []);

  // Main Timer Effect for Video / Trivia / Playable
  useEffect(() => {
    if (!isPlaying || isCompleted) return;

    let interval: NodeJS.Timeout;

    if (format === 'video') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setProgress(100);
            setIsCompleted(true);
            return 0;
          }
          const nextTime = prev - 1;
          setProgress(((15 - nextTime) / 15) * 100);
          return nextTime;
        });
      }, 1000);
    } else if (format === 'playable') {
      // Playable gives you 12 seconds to collect 5 coins!
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (score >= 5) {
              setIsCompleted(true);
            } else {
              // Failed to collect 5 coins, restart or give mercy
              setIsCompleted(true); // Mercy payout
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, format, isCompleted, score]);

  // Handle Playable Coin Click
  const handleCoinClick = () => {
    setScore((prev) => {
      const nextScore = prev + 1;
      if (nextScore >= 5) {
        setIsCompleted(true);
      }
      return nextScore;
    });
    // Move coin to a new random percentage position
    setCoinPosition({
      x: Math.floor(Math.random() * 80) + 10,
      y: Math.floor(Math.random() * 80) + 10,
    });
  };

  const startAd = () => {
    setIsPlaying(true);
    setTimeLeft(format === 'video' ? 15 : format === 'playable' ? 12 : 0);
    setProgress(0);
  };

  const handleTriviaAnswer = (index: number) => {
    setSelectedOption(index);
    if (index === triviaQuestion.correct) {
      setTriviaAnsweredCorrectly(true);
      // Brief delay before showing completion
      setTimeout(() => {
        setIsCompleted(true);
      }, 1500);
    } else {
      setTriviaAnsweredCorrectly(false);
      // Give a small delay and let them retry a different question
      setTimeout(() => {
        setSelectedOption(null);
        setTriviaAnsweredCorrectly(null);
        const randomTrivia = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
        setTriviaQuestion(randomTrivia);
      }, 2000);
    }
  };

  const handleClaim = () => {
    onAdCompleted(format, earnedCoins);
  };

  return (
    <div id="ad-simulator-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
            <span className="font-mono text-xs text-rose-400 font-bold tracking-wider uppercase">SPONSORED REWARD AD</span>
          </div>
          <button 
            id="close-ad-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ad Container */}
        <div className="flex-1 min-h-[320px] bg-slate-950 relative flex flex-col items-center justify-center p-6 text-center">
          <AnimatePresence mode="wait">
            {!isPlaying && !isCompleted && (
              <motion.div 
                key="pre-play"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center max-w-xs space-y-6"
              >
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
                  <Play className="w-8 h-8 fill-amber-500" />
                </div>
                <div>
                  <h3 className="font-sans text-xl font-bold text-white tracking-tight">Your Ad is Ready!</h3>
                  <p className="font-sans text-xs text-slate-400 mt-2 leading-relaxed">
                    Watch this short, interactive sponsor ad to credit <span className="text-amber-400 font-bold">{earnedCoins} Coins</span> instantly to your account.
                  </p>
                </div>
                <button
                  id="start-ad-btn"
                  onClick={startAd}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all font-sans flex items-center justify-center space-x-2 group cursor-pointer"
                >
                  <span>Start Earning</span>
                  <Play className="w-4 h-4 fill-slate-950 transition-transform group-hover:translate-x-1" />
                </button>
              </motion.div>
            )}

            {isPlaying && !isCompleted && format === 'video' && (
              <motion.div 
                key="video-play"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 bg-gradient-to-br ${currentCampaign.color} flex flex-col justify-between p-6 overflow-hidden`}
              >
                {/* Ad Video Top bar */}
                <div className="flex justify-between items-center text-white z-10">
                  <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center space-x-1">
                    <span className="text-amber-400 font-extrabold">+{timeLeft}s</span>
                    <span className="text-slate-300">remaining</span>
                  </div>
                  <button 
                    id="mute-btn"
                    onClick={() => setIsMuted(!isMuted)} 
                    className="p-1.5 bg-black/40 backdrop-blur-md rounded-full text-slate-200 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Ad Video Gameplay visual */}
                <div className="my-auto flex flex-col items-center justify-center z-10 select-none">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }} 
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-xl"
                  >
                    <span className="text-3xl font-bold text-white font-sans">
                      {currentCampaign.title.charAt(0)}
                    </span>
                  </motion.div>
                  <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 border border-white/10 uppercase tracking-wider">
                    {currentCampaign.tag}
                  </span>
                  <h4 className="text-xl font-extrabold text-white tracking-tight">{currentCampaign.title}</h4>
                  <p className="text-xs text-white/80 max-w-xs mt-2 font-sans px-2 leading-relaxed">
                    {currentCampaign.description}
                  </p>
                </div>

                {/* Ad Video Bottom bar Progress */}
                <div className="w-full space-y-3 z-10">
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-white/70">
                    <span>Rewarded Ad Powered by sponsor</span>
                    <span className="text-amber-400 font-bold">Earn {earnedCoins} Coins</span>
                  </div>
                </div>

                {/* Floating graphic bubbles to make it look active */}
                <div className="absolute top-12 left-10 w-24 h-24 bg-white/5 rounded-full filter blur-xl animate-pulse"></div>
                <div className="absolute bottom-16 right-8 w-32 h-32 bg-amber-500/10 rounded-full filter blur-2xl animate-pulse"></div>
              </motion.div>
            )}

            {isPlaying && !isCompleted && format === 'playable' && (
              <motion.div 
                key="playable-play"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-4 overflow-hidden select-none"
              >
                {/* Playable Header */}
                <div className="flex justify-between items-center">
                  <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[11px] font-mono text-slate-300">
                    Catch <span className="text-amber-400 font-bold">5 Coins</span> to win!
                  </div>
                  <div className="bg-rose-950 border border-rose-800 px-3 py-1 rounded-full text-[11px] font-mono text-rose-400 font-bold flex items-center space-x-1">
                    <span>Timer:</span>
                    <span className="animate-pulse">{timeLeft}s</span>
                  </div>
                  <div className="bg-amber-950 border border-amber-800 px-3 py-1 rounded-full text-[11px] font-mono text-amber-400 font-bold">
                    Score: {score}/5
                  </div>
                </div>

                {/* Playable Stage */}
                <div className="flex-1 relative bg-slate-900 border border-slate-800/60 rounded-xl my-3 overflow-hidden">
                  <AnimatePresence>
                    {score < 5 && (
                      <motion.button
                        id="playable-coin-btn"
                        key={`coin-${score}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        style={{ 
                          left: `${coinPosition.x}%`, 
                          top: `${coinPosition.y}%`,
                        }}
                        onClick={handleCoinClick}
                        className="absolute w-12 h-12 bg-amber-500 hover:bg-amber-400 rounded-full flex items-center justify-center text-slate-950 font-bold font-mono shadow-lg shadow-amber-500/30 border border-amber-300 cursor-pointer"
                      >
                        <Sparkles className="w-5 h-5 text-slate-950" />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* Grid overlay for aesthetic */}
                  <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
                </div>

                {/* Playable Bottom label */}
                <span className="text-[10px] font-mono text-slate-500">
                  PLAYABLE AD: Tap the gold coins to complete!
                </span>
              </motion.div>
            )}

            {isPlaying && !isCompleted && format === 'trivia' && (
              <motion.div 
                key="trivia-play"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full text-left space-y-4"
              >
                <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                  <HelpCircle className="w-5 h-5" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">ROBLOX TRIVIA CHALLENGE</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <h4 className="font-sans text-sm font-semibold text-white leading-relaxed">
                    {triviaQuestion.question}
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {triviaQuestion.options.map((opt, idx) => {
                    let btnColor = "bg-slate-900 hover:bg-slate-850 text-slate-200 border-slate-800";
                    if (selectedOption === idx) {
                      if (triviaAnsweredCorrectly === true) {
                        btnColor = "bg-emerald-950/40 border-emerald-500/50 text-emerald-400";
                      } else if (triviaAnsweredCorrectly === false) {
                        btnColor = "bg-rose-950/40 border-rose-500/50 text-rose-400";
                      }
                    }

                    return (
                      <button
                        id={`trivia-option-${idx}-btn`}
                        key={idx}
                        disabled={selectedOption !== null}
                        onClick={() => handleTriviaAnswer(idx)}
                        className={`w-full text-left font-sans text-xs font-medium p-3.5 rounded-xl border ${btnColor} transition-all duration-200 cursor-pointer flex justify-between items-center`}
                      >
                        <span>{opt}</span>
                        {selectedOption === idx && triviaAnsweredCorrectly === true && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {selectedOption === idx && triviaAnsweredCorrectly === false && (
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] font-sans text-slate-500 text-center mt-2">
                  Correct answer triggers instant coin delivery. Wrong answer restarts trivia.
                </p>
              </motion.div>
            )}

            {isCompleted && (
              <motion.div 
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center max-w-xs space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 relative">
                  <Trophy className="w-10 h-10" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-dashed border-emerald-500/20"
                  />
                </div>
                <div>
                  <h3 className="font-sans text-xl font-bold text-white tracking-tight">Ad Completed!</h3>
                  <p className="font-sans text-xs text-slate-400 mt-2 leading-relaxed">
                    Great job, <span className="text-white font-semibold">{username}</span>! You have successfully completed the sponsor challenge.
                  </p>
                  <div className="mt-3 inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full font-mono text-amber-400 text-sm font-bold shadow-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>+{earnedCoins} Coins Credited</span>
                  </div>
                </div>
                <button
                  id="claim-ad-reward-btn"
                  onClick={handleClaim}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all font-sans cursor-pointer"
                >
                  Claim Reward
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
