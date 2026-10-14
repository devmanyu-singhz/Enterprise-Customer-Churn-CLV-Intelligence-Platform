import axios from 'axios';

// In development with Vite proxy, requests to /api/ are forwarded to http://127.0.0.1:8000/
const API_BASE = 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

export const api = {
  // Health & System
  checkHealth: async () => {
    const res = await client.get('/');
    return res.data;
  },

  // Analytics & KPIs
  getAnalytics: async () => {
    const res = await client.get('/analytics');
    return res.data;
  },

  // Dataset Operations
  getDatasetSummary: async () => {
    const res = await client.get('/dataset/summary');
    return res.data;
  },

  getSampleCustomers: async () => {
    const res = await client.get('/dataset/sample-customers');
    return res.data;
  },

  uploadDataset: async (formData) => {
    const res = await client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  resetSampleDataset: async () => {
    const res = await client.post('/upload/reset-sample');
    return res.data;
  },

  // Model Training
  trainModels: async () => {
    const res = await client.post('/train');
    return res.data;
  },

  // Predictions
  predictBatch: async (params = {}) => {
    const res = await client.post('/predict/batch', null, { params });
    return res.data;
  },

  predictIndividual: async (payload) => {
    const res = await client.post('/predict/individual', payload);
    return res.data;
  },

  // Explainability (SHAP)
  explainIndividual: async (payload) => {
    const res = await client.post('/explain/individual', payload);
    return res.data;
  },

  getGlobalExplanation: async () => {
    const res = await client.get('/explain/global');
    return res.data;
  },
};

export default api;
