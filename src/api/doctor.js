// Doctor chat API calls
const API_BASE = import.meta.env.VITE_API_BASE? import.meta.env.VITE_API_BASE + '/api/conversation' : 'http://localhost:5000/api/conversation';

// Helper function to get auth headers
function getAuthHeaders(token = null, apiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (apiKey) {
    headers['X-Gemini-API-Key'] = apiKey;
  }
  return headers;
}

export async function sendDoctorMessage({ message, sessionId, token = null, apiKey = null }) {
  try {
    const body = { message, sessionId };
    
    // For anonymous users, include API key in body
    if (!token && apiKey) {
      body.apiKey = apiKey;
    }
    
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getAuthHeaders(token, apiKey),
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Network response was not ok');
    }
    
    const data = await res.json();
    console.log('Doctor response:', data);
    return {
      message: data.message,
      metadata: data.metadata || {},
      stage: data.metadata?.stage || 'greeting',
      symptoms: data.metadata?.detected_symptoms || []
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Removed streaming functionality as per requirements

export async function resetDoctorSession(sessionId, token = null, apiKey = null) {
  try {
    const body = { sessionId };
    
    // For anonymous users, include API key in body
    if (!token && apiKey) {
      body.apiKey = apiKey;
    }
    
    const res = await fetch(`${API_BASE}/reset`, {
      method: 'POST',
      headers: getAuthHeaders(token, apiKey),
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Network response was not ok');
    }
    
    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error('Error resetting session:', error);
    throw error;
  }
}

export async function getDoctorSessionStatus(sessionId, token = null, apiKey = null) {
  try {
    const res = await fetch(`${API_BASE}/status/${sessionId}`, {
      headers: getAuthHeaders(token, apiKey)
    });
    if (!res.ok) throw new Error('Network response was not ok');
    return await res.json();
  } catch (error) {
    console.error('Error getting session status:', error);
    throw error;
  }
}

export async function loadConversation(sessionId, token = null, apiKey = null) {
  try {
    const res = await fetch(`${API_BASE}/${sessionId}`, {
      headers: getAuthHeaders(token, apiKey)
    });
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    return data.data.conversation;
  } catch (error) {
    console.error('Error loading conversation:', error);
    throw error;
  }
}

export async function generatePrescription(sessionId, token = null, apiKey = null) {
  try {
    const body = {};
    
    // For anonymous users, include API key in body
    if (!token && apiKey) {
      body.apiKey = apiKey;
    }
    
    const res = await fetch(`${API_BASE}/${sessionId}/prescription`, {
      method: 'POST',
      headers: getAuthHeaders(token, apiKey),
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to generate prescription');
    }
    
    const data = await res.json();
    console.log('Prescription generated:', data);
    return data;
  } catch (error) {
    console.error('Error generating prescription:', error);
    throw error;
  }
}

export async function getPrescription(sessionId, token = null, apiKey = null) {
  try {
    const res = await fetch(`${API_BASE}/${sessionId}/prescription`, {
      method: 'GET',
      headers: getAuthHeaders(token, apiKey)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to get prescription');
    }
    
    const data = await res.json();
    console.log('Prescription retrieved:', data);
    return data;
  } catch (error) {
    console.error('Error getting prescription:', error);
    throw error;
  }
}

// Get user's chat history
export async function getUserChats(token, page = 1, limit = 10) {
  try {
    const res = await fetch(`${API_BASE}/user/chats?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(token)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to get chat history');
    }
    
    const data = await res.json();
    return data.data.chats || [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
}

// Delete a conversation
export async function deleteConversation(sessionId, token) {
  try {
    const res = await fetch(`${API_BASE}/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to delete conversation');
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}
