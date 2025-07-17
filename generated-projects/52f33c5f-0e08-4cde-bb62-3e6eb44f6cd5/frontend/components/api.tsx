import axios from 'axios';
import { config } from '../utils/constants';

const apiClient = axios.create({
  baseURL: config.API_URL
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const { config, response: { status } } = error;
    if (status === 500 && !config.__isRetryRequest) {
      config.__isRetryRequest = true;
      return apiClient(config);
    }
    return Promise.reject(error);
  }
);

export default apiClient;