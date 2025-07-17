import React, { useState, useEffect } from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({ message, type, duration = 3000 }) => {
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  const getNotificationStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return '';
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 right-4 p-4 rounded shadow-lg ${getNotificationStyle()}`}
    >
      {message}
    </div>
  );
};

export default Notification;