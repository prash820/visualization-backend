import React, { useState, useEffect } from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({ message, type, duration = 3000 }) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration]);

  const dismissNotification = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={`notification ${type}`} role="alert" aria-live="assertive">
      <span>{message}</span>
      <button onClick={dismissNotification} aria-label="Dismiss notification">X</button>
    </div>
  );
};

export default Notification;