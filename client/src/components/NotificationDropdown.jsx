import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';

const NotificationDropdown = () => {
  const { notifications, isPanelOpen, closePanel, markAsRead, markAllAsRead } = useNotification();

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={closePanel}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: 20, transition: { duration: 0.15 } }}
            className="fixed md:absolute top-16 right-4 md:right-0 z-50 w-[calc(100vw-32px)] md:w-[350px] max-h-[80vh] overflow-y-auto rounded-3xl bg-[#0b0f19]/80 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0b0f19]/80 backdrop-blur-md z-10">
              <h3 className="text-white font-medium text-lg">Notifications</h3>
              <button 
                onClick={markAllAsRead}
                className="text-xs text-white/50 hover:text-white/90 transition-colors"
              >
                Mark all as read
              </button>
            </div>

            <div className="flex flex-col p-2 gap-2">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">
                  No new notifications in the Void.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-4 rounded-2xl flex gap-3 cursor-pointer transition-all ${
                      notif.read ? 'opacity-50 hover:opacity-100 bg-white/[0.02]' : 'bg-white/[0.06] hover:bg-white/[0.1]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      notif.sender === 'Sai' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'bg-fuchsia-500/20 text-fuchsia-300'
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {notif.sender === 'Sai' ? 'bolt' : 'favorite'}
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-bold tracking-wide uppercase ${
                           notif.sender === 'Sai' ? 'text-[#00d4ff]' : 'text-fuchsia-300'
                        }`}>
                          {notif.sender}
                        </h4>
                        <span className="text-[10px] text-white/30">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${notif.read ? 'text-white/60' : 'text-white/90'}`}>
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
