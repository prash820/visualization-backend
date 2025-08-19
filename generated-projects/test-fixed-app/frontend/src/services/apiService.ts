// apiService.ts

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { AppContext } from './types';
import { getAppContext } from './constants';

// Define an interface for the API Service
interface ApiService {
  getAppData(): Promise<AppContext>;
  updateAppData(newData: Partial<AppContext>): Promise<AppContext>;
}

// Implement the ApiService
class ApiServiceImpl implements ApiService {
  private apiClient: AxiosInstance;

  constructor(baseURL: string) {
    this.apiClient = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Method to get application data
  public async getAppData(): Promise<AppContext> {
    try {
      const response: AxiosResponse<AppContext> = await this.apiClient.get('/app-context');
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw new Error('Failed to fetch app data');
    }
  }

  // Method to update application data
  public async updateAppData(newData: Partial<AppContext>): Promise<AppContext> {
    try {
      const response: AxiosResponse<AppContext> = await this.apiClient.put('/app-context', newData);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw new Error('Failed to update app data');
    }
  }

  // Private method to handle errors
  private handleError(error: AxiosError): void {
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
}

// Create an instance of the ApiService
const apiService: ApiService = new ApiServiceImpl('https://api.example.com');

// Example usage of the apiService
(async () => {
  try {
    const appData = await apiService.getAppData();
    console.log('Fetched App Data:', appData);

    const updatedData = await apiService.updateAppData({ userRequest: { createSimpleTestApp: false } });
    console.log('Updated App Data:', updatedData);
  } catch (error) {
    console.error('Error using apiService:', error);
  }
})();

export default apiService;
