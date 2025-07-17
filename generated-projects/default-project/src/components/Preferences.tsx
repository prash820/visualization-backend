import React, { useState, useEffect } from 'react';

interface PreferencesProps {
  onSave: (preferences: UserPreferences) => void;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
}

const Preferences: React.FC<PreferencesProps> = ({ onSave }) => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    notifications: true,
  });

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPreferences({ ...preferences, theme: event.target.value as 'light' | 'dark' });
  };

  const handleNotificationsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences({ ...preferences, notifications: event.target.checked });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(preferences);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="User Preferences">
      <div>
        <label htmlFor="theme-select">Theme:</label>
        <select
          id="theme-select"
          value={preferences.theme}
          onChange={handleThemeChange}
          aria-label="Select theme"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div>
        <label htmlFor="notifications-toggle">Enable Notifications:</label>
        <input
          id="notifications-toggle"
          type="checkbox"
          checked={preferences.notifications}
          onChange={handleNotificationsChange}
          aria-label="Toggle notifications"
        />
      </div>
      <button type="submit" aria-label="Save preferences">Save</button>
    </form>
  );
};

export default Preferences;