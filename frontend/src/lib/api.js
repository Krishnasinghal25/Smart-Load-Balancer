import axios from 'axios';

// Base URL for the load balancer control API. Defaults to the LB on :3000.
export const API_BASE = import.meta.env.VITE_API_URL || `http://${location.hostname}:3030`;

export const api = axios.create({ baseURL: API_BASE, timeout: 8000 });

export const setStrategy = (strategy) => api.post('/lb/strategy', { strategy }).then((r) => r.data);
export const getHistory = () => api.get('/lb/history').then((r) => r.data);
export const askAssistant = (message) => api.post('/lb/chat', { message }).then((r) => r.data);

// User controls — the dashboard "Control Console".
export const sendRequests = (payload) => api.post('/lb/send', payload).then((r) => r.data);
export const setTraffic = (enabled) => api.post('/lb/traffic', { enabled }).then((r) => r.data);
export const addBackend = () => api.post('/lb/backend/add').then((r) => r.data);
export const removeBackend = (id) => api.post('/lb/backend/remove', { id }).then((r) => r.data);
export const injectFault = (id, mode) => api.post('/lb/backend/fault', { id, mode }).then((r) => r.data);
