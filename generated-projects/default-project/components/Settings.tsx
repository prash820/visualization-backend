import React, { useState, useEffect } from 'react';

interface SettingsProps {
  onSettingsChange: (settings: SettingsState) => void;
}

interface SettingsState {
  theme: string;
  precision: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Settings: React.FC<SettingsProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<SettingsState>({ theme: 'light', precision: 2 });

  useEffect(() => {
    // Fetch initial settings from API or local storage
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = event.target.value;
    setSettings((prevSettings) => ({ ...prevSettings, theme: newTheme }));
    onSettingsChange({ ...settings, theme: newTheme });
  };

  const handlePrecisionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPrecision = parseInt(event.target.value, 10);
    setSettings((prevSettings) => ({ ...prevSettings, precision: newPrecision }));
    onSettingsChange({ ...settings, precision: newPrecision });
  };

  return (
    <div>
      <h2>Settings</h2>
      <div>
        <label htmlFor="theme-select">Theme:</label>
        <select id="theme-select" value={settings.theme} onChange={handleThemeChange} aria-label="Select theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div>
        <label htmlFor="precision-input">Precision:</label>
        <input
          id="precision-input"
          type="number"
          value={settings.precision}
          onChange={handlePrecisionChange}
          aria-label="Set calculation precision"
        />
      </div>
    </div>
  );
};

export default Settings;