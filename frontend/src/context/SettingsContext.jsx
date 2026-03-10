import { createContext, useContext, useState, useEffect } from 'react';
import { publicAPI } from '../api';

const SettingsContext = createContext({});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    publicAPI.settings()
      .then(r => setSettings(r.data || {}))
      .catch(() => {/* settings unavailable, silently continue */});
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
