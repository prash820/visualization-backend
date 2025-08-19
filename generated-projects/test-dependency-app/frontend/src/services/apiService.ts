// apiService.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AppContext } from './types';
import { validateAppContext } from './constants';

// Define a type for API Service configuration
interface ApiServiceConfig {
  baseURL: string;
  timeout: number;
}

// Define a class for the API Service
class ApiService {
  private axiosInstance: AxiosInstance;
  private context: AppContext;

  constructor(config: ApiServiceConfig, context: AppContext) {
    // Validate the application context
    validateAppContext(context);
    this.context = context;

    // Create an Axios instance with the provided configuration
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
    });

    // Add a request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        // You can add custom headers or authentication tokens here
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add a response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        // Handle errors globally
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Method to perform GET requests
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      return response.data;
    } catch (error) {
      throw new Error(`GET request failed: ${error}`);
    }
  }

  // Method to perform POST requests
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw new Error(`POST request failed: ${error}`);
    }
  }

  // Additional methods for PUT, DELETE, etc., can be added here
}

// Example usage of the ApiService
const apiServiceConfig: ApiServiceConfig = {
  baseURL: 'https://api.example.com',
  timeout: 10000,
};

const apiService = new ApiService(apiServiceConfig, APP_CONTEXT);

export default apiService;
