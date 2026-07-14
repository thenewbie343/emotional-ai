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

  // Listen for admin approvals on data export requests
  useEffect(() => {
    import('../lib/supabaseClient').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        
        const channel = supabase
          .channel('schema-db-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'data_export_requests',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              if (['approved', 'rejected'].includes(payload.new.status) && payload.new.status !== payload.old.status) {
                const isApproved = payload.new.status === 'approved';
                if (payload.new.request_type === 'account_change') {
                  addNotification({
                    sender: 'System',
                    message: isApproved 
                      ? "Your email/password change request has been approved and handled."
                      : "Your email/password change request has been rejected.",
                    type: isApproved ? 'success' : 'error'
                  });
                } else {
                  addNotification({
                    sender: 'System',
                    message: isApproved
                      ? "Your data export is ready! Go to Settings -> Data & Privacy and click 'Download Data Export' to download it."
                      : "Your data export request has been rejected.",
                    type: isApproved ? 'success' : 'error'
                  });
                }
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      });
    });
  }, [addNotification]);

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
