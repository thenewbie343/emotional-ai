import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';

const NotificationToast = () => {
  const { currentToast, dismissToast, openPanel } = useNotification();

  const handleToastClick = () => {
    openPanel();
    dismissToast();
  };

  return (
    <AnimatePresence>
      {currentToast && (
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
          className={`fixed top-[80px] right-4 z-50 p-4 w-[320px] rounded-2xl cursor-pointer shadow-2xl backdrop-blur-xl border ${
            currentToast.sender === 'Sai' 
              ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]' 
              : 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300'
          }`}
          onClick={handleToastClick}
          drag="x"
          dragConstraints={{ left: 0, right: 300 }}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.x > 100 || velocity.x > 500) {
              dismissToast();
            }
          }}
        >
          <div className="flex items-start gap-3 pointer-events-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              currentToast.sender === 'Sai' ? 'bg-[#00d4ff]/20' : 'bg-fuchsia-500/20'
            }`}>
              <span className="material-symbols-outlined text-[18px]">
                {currentToast.sender === 'Sai' ? 'bolt' : 'favorite'}
              </span>
            </div>
            
            <div className="flex-1">
              <h4 className="text-sm font-bold tracking-wide uppercase opacity-80 mb-1">
                {currentToast.sender}
              </h4>
              <p className="text-sm leading-relaxed text-white/90">
                {currentToast.message}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationToast;
