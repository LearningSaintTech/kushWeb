/**
 * Unauthenticated API client for public storefront endpoints.
 * No Bearer token, no refresh interceptor, no logout on 401.
 */
import axios from 'axios';
import { API_BASE_URL, getTunnelBypassHeaders } from './config.js';

const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'x-client-channel': 'website',
    ...getTunnelBypassHeaders(),
  },
});

export default publicClient;
