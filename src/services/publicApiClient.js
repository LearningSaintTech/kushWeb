/**
 * Unauthenticated API client for public storefront endpoints.
 * No Bearer token, no refresh interceptor, no logout on 401.
 */
import axios from 'axios';
import { API_BASE_URL, getTunnelBypassHeaders } from './config.js';
import { reportClientTimeout } from '../utils/reportClientTimeout.js';

const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'x-client-channel': 'website',
    'x-source-platform': 'website',
    ...getTunnelBypassHeaders(),
  },
});

publicClient.interceptors.request.use((config) => {
  config.metadata = { ...(config.metadata || {}), startedAt: Date.now() };
  return config;
});

publicClient.interceptors.response.use(
  (res) => res,
  (error) => {
    reportClientTimeout(error, { client: 'website' });
    return Promise.reject(error);
  },
);

export default publicClient;
