import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentToast, setCurrentToast] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Load existing notifications from localStorage on mount (for history)
  useEffect(() => {
    const saved = localStorage.getItem('notification_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      } catch (e) {
        console.error("Error loading notifications:", e);
      }
    }
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem('notification_history', JSON.stringify(notifications));
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Handle toast timeout
  useEffect(() => {
    if (currentToast) {
      const timer = setTimeout(() => {
        setCurrentToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentToast]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      return false;
    }
  };

  const addNotification = useCallback(async (notification) => {
    const newNotification = {
      id: Date.now().toString(),
      ...notification,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // keep last 50
    setCurrentToast(newNotification);

    // Try native push if not in focus
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.sender || 'Antigravity Island', {
        body: notification.message,
        icon: notification.sender === 'Sai' ? '/sai-icon.png' : '/shuna-icon.png' // Adjust icons as needed
      });
    }
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismissToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
    setCurrentToast(null);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    if (!isPanelOpen) {
      requestPushPermission(); // Ask for push permission on first click
    }
    setIsPanelOpen(prev => !prev);
    setCurrentToast(null);
  }, [isPanelOpen]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      currentToast,
      isPanelOpen,
      addNotification,
      markAsRead,
      markAllAsRead,
      dismissToast,
      openPanel,
      closePanel,
      togglePanel,
      requestPushPermission
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
