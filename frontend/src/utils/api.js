const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const api = {
  // Auth
  signup: async (email, password, fullName) => {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName })
    });
    return response.json();
  },

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  // Channels
  getChannels: async () => {
    const response = await fetch(`${API_URL}/api/channels`);
    return response.json();
  },

  createChannel: async (name, description, userId) => {
    const response = await fetch(`${API_URL}/api/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, userId })
    });
    return response.json();
  },

  joinChannel: async (channelId, userId) => {
    const response = await fetch(`${API_URL}/api/channels/${channelId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return response.json();
  },

  // Messages
  getMessages: async (channelId, limit = 50, offset = 0) => {
    const response = await fetch(
      `${API_URL}/api/channels/${channelId}/messages?limit=${limit}&offset=${offset}`
    );
    return response.json();
  },

  // Users
  getOnlineUsers: async () => {
    const response = await fetch(`${API_URL}/api/users/online`);
    return response.json();
  }
};