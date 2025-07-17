import { useEffect, useState } from 'react';
import { config } from '../utils/constants';

export const useConfig = () => {
  const [appConfig, setAppConfig] = useState(config);

  useEffect(() => {
    setAppConfig(config);
  }, []);

  return appConfig;
};