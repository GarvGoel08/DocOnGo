// Doctor chat API calls
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api/conversation';

export async function sendDoctorMessage({ message, sessionId }) {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });
    
    if (!res.ok) throw new Error('Network response was not ok');
    
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

export async function resetDoctorSession(sessionId) {
  try {
    const res = await fetch(`${API_BASE}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    if (!res.ok) throw new Error('Network response was not ok');
    
    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error('Error resetting session:', error);
    throw error;
  }
}

export async function getDoctorSessionStatus(sessionId) {
  try {
    const res = await fetch(`${API_BASE}/status/${sessionId}`);
    if (!res.ok) throw new Error('Network response was not ok');
    return await res.json();
  } catch (error) {
    console.error('Error getting session status:', error);
    throw error;
  }
}
