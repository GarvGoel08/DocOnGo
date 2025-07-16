// Authentication API calls
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api/auth';

// Helper function to get auth headers
function getAuthHeaders(token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Register a new user
export async function registerUser({ email, password, name }) {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password, name })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

// Login user
export async function loginUser({ email, password }) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Login failed');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
}

// Get user profile
export async function getUserProfile(token) {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: getAuthHeaders(token)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to get profile');
    }
    
    const data = await res.json();
    return data.data.user;
  } catch (error) {
    console.error('Error getting profile:', error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(token, { name }) {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ name })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }
    
    const data = await res.json();
    return data.data.user;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

// Set user's Gemini API key
export async function setUserApiKey(token, apiKey) {
  try {
    const res = await fetch(`${API_BASE}/api-key`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ apiKey })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to save API key');
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error setting API key:', error);
    throw error;
  }
}

// Check if user has an API key
export async function checkUserApiKey(token) {
  try {
    const res = await fetch(`${API_BASE}/api-key/check`, {
      headers: getAuthHeaders(token)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to check API key');
    }
    
    const data = await res.json();
    return data.hasApiKey;
  } catch (error) {
    console.error('Error checking API key:', error);
    throw error;
  }
}

// Get user's decrypted API key
export async function getUserApiKey(token) {
  try {
    const res = await fetch(`${API_BASE}/api-key`, {
      headers: getAuthHeaders(token)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to get API key');
    }
    
    const data = await res.json();
    return data.apiKey;
  } catch (error) {
    console.error('Error getting API key:', error);
    throw error;
  }
}
