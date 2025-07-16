import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { checkUserApiKey, getUserApiKey, setUserApiKey } from '../api/auth';

const GeminiApiKeyContext = createContext();

export const useGeminiApiKey = () => {
  const context = useContext(GeminiApiKeyContext);
  if (!context) {
    throw new Error('useGeminiApiKey must be used within a GeminiApiKeyProvider');
  }
  return context;
};

export const GeminiApiKeyProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [apiKey, setApiKey] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check for API key on mount and auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      checkApiKey();
    } else {
      // For anonymous users, check local storage
      const storedApiKey = localStorage.getItem('gemini_api_key');
      if (storedApiKey) {
        setApiKey(storedApiKey);
        setHasApiKey(true);
      }
    }
  }, [isAuthenticated, token]);

  // Check if logged-in user has an API key
  const checkApiKey = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const hasKey = await checkUserApiKey(token);
      setHasApiKey(hasKey || false);
      
      // If user has API key, fetch it for use
      if (hasKey) {
        await fetchUserApiKey();
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      setHasApiKey(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's API key from backend
  const fetchUserApiKey = async () => {
    if (!token) return;
    
    try {
      const apiKeyData = await getUserApiKey(token);
      setApiKey(apiKeyData);
    } catch (error) {
      console.error('Error fetching API key:', error);
    }
  };

  // Save API key for logged-in users
  const saveUserApiKey = async (newApiKey) => {
    if (!token) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      await setUserApiKey(token, newApiKey);

      setApiKey(newApiKey);
      setHasApiKey(true);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Save API key for anonymous users (local storage)
  const saveAnonymousApiKey = (newApiKey) => {
    localStorage.setItem('gemini_api_key', newApiKey);
    setApiKey(newApiKey);
    setHasApiKey(true);
    return { success: true };
  };

  // Save API key (handles both logged-in and anonymous users)
  const saveApiKey = async (newApiKey) => {
    // Basic validation
    if (!newApiKey || !newApiKey.trim()) {
      return { success: false, message: 'API key is required' };
    }

    if (!newApiKey.startsWith('AIza') || newApiKey.length < 30) {
      return { success: false, message: 'Invalid Gemini API key format' };
    }

    if (isAuthenticated) {
      return await saveUserApiKey(newApiKey);
    } else {
      return saveAnonymousApiKey(newApiKey);
    }
  };

  // Clear API key
  const clearApiKey = () => {
    setApiKey(null);
    setHasApiKey(false);
    
    if (!isAuthenticated) {
      localStorage.removeItem('gemini_api_key');
    }
    // Note: For logged-in users, we don't auto-delete from backend
    // User would need to explicitly update it through settings
  };

  // Get API key for making requests
  const getApiKeyForRequest = () => {
    return apiKey;
  };

  // Check if we need to prompt for API key
  const needsApiKey = () => {
    return !hasApiKey || !apiKey;
  };

  const value = {
    apiKey,
    hasApiKey,
    loading,
    saveApiKey,
    clearApiKey,
    getApiKeyForRequest,
    needsApiKey,
    checkUserApiKey: checkApiKey
  };

  return (
    <GeminiApiKeyContext.Provider value={value}>
      {children}
    </GeminiApiKeyContext.Provider>
  );
};
