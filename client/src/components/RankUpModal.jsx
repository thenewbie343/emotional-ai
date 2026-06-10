import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkRankAchievement } from '../utils/achievementTriggers';
import { useIslandAchievements } from '../hooks/useIslandAchievements';

export default function RankUpModal({ rank, message, onClose }) {
  const [visible, setVisible] = useState(true);
  const { unlockAchievement } = useIslandAchievements();

  useEffect(() => {
    // Unlock island achievement if rank is Mastermind
    if (rank) {
      checkRankAchievement(rank, unlockAchievement).catch(console.error);
    }
  }, [rank, unlockAchievement]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 500);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
            className="bg-[#121214] border border-purple-500/30 rounded-3xl p-8 max-w-lg w-full text-center relative shadow-[0_0_50px_rgba(124,92,252,0.3)] overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent pointer-events-none"></div>

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", delay: 0.2, duration: 0.8 }}
              className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-purple-500/20"
            >
              <span className="material-symbols-outlined text-[48px] text-white">workspace_premium</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-white mb-2"
            >
              Rank Up: <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">{rank}</span>
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-5 mb-6 relative mt-6 text-left"
            >
              <span className="absolute -top-3 left-4 bg-[#121214] px-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest border border-purple-500/20 rounded-full">Message from SAI</span>
              <p className="text-sm text-gray-200 leading-relaxed italic">"{message}"</p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md active:scale-95"
            >
              Acknowledge
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
