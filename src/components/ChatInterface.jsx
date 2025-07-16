import { useRef, useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useGeminiApiKey } from "../contexts/GeminiApiKeyContext";
import { 
  sendDoctorMessage, 
  resetDoctorSession, 
  getDoctorSessionStatus, 
  generatePrescription, 
  getPrescription,
  loadConversation,
  getUserChats,
  deleteConversation as deleteConversationAPI
} from "../api/doctor";
import ReactMarkdown from 'react-markdown';
import AuthModal from './AuthModal';
import ApiKeyModal from './ApiKeyModal';
import PrescriptionModal from './PrescriptionModal';

function randomSessionId() {
  return "sess-" + Math.random().toString(36).slice(2, 12);
}

// Helper function to extract message from JSON if possible
function extractMessageFromJson(text) {
  if (!text) return text;

  // If it's already a clean text message, return it
  if (!text.includes('{') && !text.includes('"message"')) {
    return text;
  }

  const jsonRegex = /(```json\s*|\"{0,1}json\"{0,1}\s*|\s*)?(\{[\s\S]*?\})(\s*```)?/;
  const match = text.match(jsonRegex);

  let jsonText = text;
  if (match && match[2]) {
    jsonText = match[2];
  }

  try {
    if (jsonText.trim().startsWith("{") || jsonText.trim().startsWith("[")) {
      const parsed = JSON.parse(jsonText);
      if (parsed) {
        if (parsed.message && typeof parsed.message === 'string') {
          return parsed.message;
        } else if (typeof parsed === "object") {
          // Search through all properties for a message field
          for (const key in parsed) {
            if (key === "message" && typeof parsed[key] === "string") {
              return parsed[key];
            }
          }
        }
      }
    }
    return text;
  } catch (e) {
    console.log("JSON parsing error:", e);
    // If we can't parse it and it looks like JSON, return a fallback message
    if (text.includes('{') && text.includes('"message"')) {
      return "I'm processing your information. Could you please provide more details?";
    }
    return text;
  }
}

const CHAT_STAGES = [
  "GREETING",
  "SYMPTOM_COLLECTION", 
  "DETAILED_ASSESSMENT",
  "MEDICAL_HISTORY",
  "RECOMMENDATIONS",
  "FOLLOW_UP",
];

function getStageProgress(stage) {
  if (!stage) return 10;
  const currentIndex = CHAT_STAGES.findIndex(
    (s) =>
      stage.toUpperCase().includes(s.replace(/_/g, "")) ||
      stage.toUpperCase() === s
  );
  if (currentIndex === -1) return 20;
  return Math.min(100, Math.max(10, Math.round(((currentIndex + 1) / CHAT_STAGES.length) * 100)));
}

export default function ChatInterface() {
  const { user, token } = useAuth();
  const { 
    apiKey, 
    hasApiKey, 
    needsApiKey, 
    saveApiKey, 
    getApiKeyForRequest 
  } = useGeminiApiKey();
  const [currentSessionId, setCurrentSessionId] = useState(randomSessionId());
  const [conversations, setConversations] = useState({});
  const [currentMessages, setCurrentMessages] = useState([
    { from: "ai", text: "Hello! I am Dr. AI. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState({
    stage: CHAT_STAGES[0],
    confidence_level: 0.95,
    detected_symptoms: [],
  });
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [typingUsers, setTypingUsers] = useState([]);
  const [prescription, setPrescription] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState("");
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const chatEndRef = useRef(null);

  // Check for API key on component mount
  useEffect(() => {
    if (needsApiKey()) {
      setShowApiKeyModal(true);
    }
    else{
      setShowApiKeyModal(false);
    }
  }, [needsApiKey]);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Load chat history when user is authenticated
  useEffect(() => {
    if (user && token) {
      loadChatHistory();
    } else {
      setChatHistory([]);
    }
  }, [user, token]);

  const loadChatHistory = async () => {
    if (!token) return;
    
    setLoadingHistory(true);
    try {
      const chats = await getUserChats(token);
      setChatHistory(chats);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
    setLoadingHistory(false);
  };

  const selectConversation = async (sessionId) => {
    setCurrentSessionId(sessionId);
    
    // Check if we have this conversation cached
    if (conversations[sessionId]) {
      setCurrentMessages(conversations[sessionId].messages);
      console.log('Loaded cached conversation:', sessionId);
      console.log('Metadata:', conversations[sessionId].metadata);
      console.log('Messages:', conversations[sessionId].messages);
      setMetadata(conversations[sessionId].metadata);
      
      // Try to load existing prescription for cached conversation
      try {
        const prescriptionResponse = await getPrescription(sessionId, token, getApiKeyForRequest());
        setPrescription(prescriptionResponse.prescription);
        console.log('Loaded existing prescription for cached conversation:', prescriptionResponse);
      } catch (prescriptionError) {
        console.log('No existing prescription found for cached conversation:', prescriptionError.message);
        setPrescription(null);
      }
      return;
    }

    // Load conversation from server
    try {
      const conv = await loadConversation(sessionId, token, getApiKeyForRequest());
      
      const messages = conv.messages.map(msg => ({
        from: msg.role === 'user' ? 'user' : 'ai',
        text: msg.role === 'user' ? msg.content : extractMessageFromJson(msg.content)
      }));
      console.log('Loaded conversation data:', conv);
      
      // Fix: Ensure consistent stage mapping - check both possible field names
      const stage = conv.current_stage || conv.stage || 'GREETING';
      
      const convData = {
        messages,
        metadata: {
          stage: stage,
          detected_symptoms: conv.detectedSymptoms || [],
          confidence_level: conv.confidence_level || 0.8
        }
      };
      
      console.log('Loaded conversation from server:', {
        sessionId,
        stage,
        originalConv: conv,
        finalMetadata: convData.metadata
      });
      
      setConversations(prev => ({ ...prev, [sessionId]: convData }));
      setCurrentMessages(messages);
      setMetadata(convData.metadata);
      
      // Try to load existing prescription
      try {
        const prescriptionResponse = await getPrescription(sessionId, token, getApiKeyForRequest());
        setPrescription(prescriptionResponse.prescription);
        console.log('Loaded existing prescription:', prescriptionResponse);
      } catch (prescriptionError) {
        // No prescription exists yet, which is fine
        console.log('No existing prescription found:', prescriptionError.message);
        setPrescription(null);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const startNewConversation = () => {
    const newSessionId = randomSessionId();
    setCurrentSessionId(newSessionId);
    const initialMessages = [{ from: "ai", text: "Hello! I am Dr. AI. How can I help you today?" }];
    setCurrentMessages(initialMessages);
    setMetadata({
      stage: CHAT_STAGES[0],
      confidence_level: 0.95,
      detected_symptoms: [],
    });
    setError("");
    setPrescription(null);
    setPrescriptionError("");
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Check if we have an API key
    if (needsApiKey()) {
      setShowApiKeyModal(true);
      return;
    }

    const userMsg = input;
    const newMessages = [...currentMessages, { from: "user", text: userMsg }];
    setCurrentMessages(newMessages);
    setLoading(true);
    setError("");
    setInput("");

    // Add typing indicator
    setTimeout(() => {
      setCurrentMessages(prev => [...prev, { from: "ai", text: "", isTyping: true }]);
    }, 500);

    try {
      const response = await sendDoctorMessage({ 
        message: userMsg, 
        sessionId: currentSessionId,
        token,
        apiKey: getApiKeyForRequest()
      });

      // Remove typing indicator
      setCurrentMessages(prev => prev.filter(m => !m.isTyping));

      // Extract the actual message content and clean it
      const messageContent = extractMessageFromJson(response.message || "I'm processing your request...");
      const aiMessage = { from: "ai", text: messageContent };
      const finalMessages = [...newMessages, aiMessage];
      
      setCurrentMessages(finalMessages);
      
      // Update metadata - ensure consistent stage field mapping
      const newMetadata = {
        stage: response.metadata?.current_stage || response.metadata?.stage || metadata.stage || 'GREETING',
        confidence_level: response.metadata?.confidence_level || 0.5,
        detected_symptoms: response.metadata?.detected_symptoms || [],
        suggested_followup: response.metadata?.suggested_followup || ""
      };
      
      console.log('Updated metadata:', {
        responseMetadata: response.metadata,
        newMetadata,
        currentStage: newMetadata.stage
      });
      
      setMetadata(newMetadata);

      // Cache conversation with consistent metadata
      setConversations(prev => ({
        ...prev,
        [currentSessionId]: { messages: finalMessages, metadata: newMetadata }
      }));

      // Reload chat history if user is logged in
      if (user && token) {
        loadChatHistory();
      }
      
    } catch (err) {
      console.error(err);
      setCurrentMessages(prev => prev.filter(m => !m.isTyping));
      
      // Check if error is related to API key
      if (err.message.includes('API key') || err.message.includes('Gemini')) {
        setError("API key issue: " + err.message);
        setShowApiKeyModal(true);
      } else {
        setError("Failed to get response. Please try again.");
      }
      
      setCurrentMessages(prev => [...prev, { 
        from: "ai", 
        text: "I'm having trouble connecting to my knowledge base. Please try again in a moment." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    // Check if we have an API key
    if (needsApiKey()) {
      setShowApiKeyModal(true);
      return;
    }

    try {
      await resetDoctorSession(currentSessionId, token, getApiKeyForRequest());
      startNewConversation();
      if (user && token) {
        loadChatHistory();
      }
    } catch (error) {
      console.error("Failed to reset session:", error);
      if (error.message.includes('API key') || error.message.includes('Gemini')) {
        setError("API key issue: " + error.message);
        setShowApiKeyModal(true);
      } else {
        setError("Failed to reset the conversation. Please try again.");
      }
    }
  };

  const deleteConversation = async (sessionId) => {
    if (!user || !token) return;
    
    try {
      await deleteConversationAPI(sessionId, token);
      setChatHistory(prev => prev.filter(chat => chat.sessionId !== sessionId));
      
      // If deleted conversation is current, start new one
      if (sessionId === currentSessionId) {
        startNewConversation();
      }
      
      // Remove from cache
      setConversations(prev => {
        const newConv = { ...prev };
        delete newConv[sessionId];
        return newConv;
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleGeneratePrescription = async () => {
    if (!currentSessionId) {
      setPrescriptionError("No active conversation session found");
      return;
    }

    // Check if we have an API key
    if (needsApiKey()) {
      setShowApiKeyModal(true);
      return;
    }

    // Check if conversation has enough messages
    if (currentMessages.length < 4) {
      setPrescriptionError("Please have a more detailed conversation before generating a prescription");
      return;
    }

    setLoadingPrescription(true);
    setPrescriptionError("");
    
    try {
      console.log(`Generating prescription for session: ${currentSessionId}`);
      const response = await generatePrescription(currentSessionId, token, getApiKeyForRequest());
      
      setPrescription(response.prescription);
      console.log('Prescription generated successfully:', response);
      
      // Show success message in the chat
      setCurrentMessages(prev => [...prev, {
        from: "ai",
        text: "I've generated your prescription! You can find it in the prescription section below. Please remember that this is for informational purposes only and you should consult with a healthcare provider before taking any medicines.",
        isPrescriptionNotification: true
      }]);
      
    } catch (error) {
      console.error('Error generating prescription:', error);
      
      if (error.message.includes('API key') || error.message.includes('Gemini')) {
        setPrescriptionError("API key issue: " + error.message);
        setShowApiKeyModal(true);
      } else {
        setPrescriptionError(error.message || "Failed to generate prescription. Please try again.");
      }
      
      // Show error message in the chat
      setCurrentMessages(prev => [...prev, {
        from: "ai",
        text: "I'm sorry, I couldn't generate a prescription at this time. Please ensure you've provided enough information about your symptoms and medical history, then try again.",
        isError: true
      }]);
    } finally {
      setLoadingPrescription(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
      {/* Sidebar */}
      {!sidebarCollapsed && (
        <div className={`bg-white/90 backdrop-blur-2xl shadow-2xl border-r border-white/30 transition-all duration-500 ease-in-out flex flex-col w-80 lg:w-96 ${window.innerWidth < 768 ? 'absolute z-50 h-full' : ''}`}>
        {/* Sidebar Header */}
        <div className="p-4 lg:p-6 border-b border-white/30 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-3 animate-fade-in">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl border border-white/30 animate-float">
                <span className="text-white text-2xl">🩺</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white drop-shadow-lg">DocOnGo</span>
                <p className="text-blue-100 text-sm font-medium">AI Medical Assistant</p>
                <div className="flex items-center mt-1">
                  <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-300 animate-pulse' : 'bg-red-300'}`}></div>
                  <span className="text-xs text-blue-100">{isOnline ? 'Connected' : 'Offline'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-300 text-white hover:shadow-xl group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transition-all duration-300 group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <>
            {/* User Section */}
            <div className="p-4 lg:p-6 border-b border-gray-200/30">
              {user ? (
                <div className="group">
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/50">
                        <span className="text-white font-bold text-xl">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-gray-900 truncate">{user.name}</p>
                      <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 ml-2 font-semibold">Premium Member</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-4 px-6 rounded-2xl font-bold hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center justify-center space-x-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="relative z-10">Login to Save Chats</span>
                </button>
              )}
            </div>

            {/* New Chat Button */}
            <div className="p-4 lg:p-6">
              <button
                onClick={startNewConversation}
                className="w-full bg-gradient-to-r from-emerald-500 via-blue-600 to-indigo-600 text-white py-5 px-6 rounded-2xl font-bold hover:from-emerald-600 hover:via-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center justify-center space-x-4 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-90 transition-all duration-500 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="relative z-10">
                  <span className="text-lg">New Consultation</span>
                  <p className="text-sm text-white/80 font-normal">Start fresh conversation</p>
                </div>
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-4 pb-3">
                <div className="flex items-center space-x-2 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Recent Chats</h3>
                </div>
              </div>
              
              {loadingHistory ? (
                <div className="px-4 py-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                    <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Loading conversations...</p>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {user ? "No conversations yet" : "Login to see your chat history"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {user ? "Start a new consultation to begin" : "Save your conversations by logging in"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 px-4 pb-4">
                  {chatHistory.map((chat, index) => (
                    <div
                      key={chat.sessionId}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-300 group hover:shadow-lg transform hover:-translate-y-0.5 animate-fade-in ${
                        chat.sessionId === currentSessionId 
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md' 
                          : 'bg-white/60 hover:bg-white/80 border border-gray-200/50 hover:border-blue-200'
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={() => selectConversation(chat.sessionId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${
                              chat.sessionId === currentSessionId ? 'bg-blue-400' : 'bg-gray-300'
                            }`}></div>
                            <h4 className="text-sm font-semibold text-gray-900 truncate">{chat.title}</h4>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium capitalize">
                              {chat.stage.replace('_', ' ')}
                            </span>
                            <span>•</span>
                            <span>{formatDate(chat.updatedAt)}</span>
                          </div>
                          {chat.detectedSymptoms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                                {chat.detectedSymptoms[0]}
                              </span>
                              {chat.detectedSymptoms.length > 1 && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                  +{chat.detectedSymptoms.length - 1} more
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center text-xs text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{chat.messageCount} messages</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(chat.sessionId);
                          }}
                          className="ml-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 hover:bg-red-50 rounded-lg"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-indigo-200/20 rounded-full blur-3xl"></div>
        </div>

        {/* Compact Chat Header */}
        <div className="relative z-10 bg-white/90 backdrop-blur-xl shadow-lg border-b border-white/30 p-3 lg:p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 text-gray-600 hover:text-blue-600 group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 transition-all duration-300 group-hover:scale-110"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div className="relative">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105">
                  <span className="text-white text-lg lg:text-xl">🩺</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border border-white shadow-sm animate-pulse"></div>
              </div>
              <div>
                <div className="text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Dr. AI</div>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <p className="text-xs text-gray-600 font-medium">
                    {isOnline ? 'Online & Ready' : 'Connection Lost'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-1">
                <span className="text-xs text-gray-600 font-medium">Session: {currentSessionId.slice(-6)}</span>
              </div>
              <button
                onClick={handleReset}
                disabled={loading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden lg:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Compact Progress Bar */}
          {metadata.stage && (
            <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 capitalize">{metadata.stage.replace('_', ' ')}</span>
                </div>
                {metadata.confidence_level && (
                  <span className={`text-xs font-semibold ${metadata.confidence_level > 0.7 ? 'text-green-600' : 'text-amber-600'}`}>
                    {Math.round(metadata.confidence_level * 100)}% Confidence
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                  style={{ width: getStageProgress(metadata.stage) + "%" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-10">
          {currentMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {msg.from === "ai" && (
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm">🩺</span>
                  </div>
                </div>
              )}
              
              <div
                className={`max-w-[75%] rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-[1.02] ${
                  msg.from === "user"
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-200"
                    : "bg-white text-gray-700 shadow-gray-200 border border-gray-100"
                }`}
              >
                {msg.isTyping ? (
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full typing-dot"></div>
                      </div>
                      <span className="text-gray-500 text-sm font-medium">Dr. AI is analyzing</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    {msg.from === "ai" && i === 0 ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl animate-bounce">👋</span>
                        <div>
                          <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{msg.text}</span>
                          <p className="text-sm text-gray-500 mt-1">I'm here to help with your medical questions.</p>
                        </div>
                      </div>
                    ) : (
                      <div className={`prose prose-sm max-w-none ${msg.from === "user" ? "prose-invert prose-blue" : ""}`}>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                            strong: ({ children }) => <strong className="font-bold text-blue-700">{children}</strong>,
                            em: ({ children }) => <em className="italic text-blue-600">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 ml-4">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 ml-4">{children}</ol>,
                            code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{children}</code>
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    
                    {msg.from === "ai" && (
                      <div className="mt-3 pt-3 border-t border-gray-100/50 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>AI response</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {msg.from === "user" && (
                <div className="flex-shrink-0 ml-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">
                      {user ? user.name.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Compact Input Form */}
        <div className="relative z-10 bg-white/95 backdrop-blur-xl border-t border-white/30 p-3 lg:p-4">
          {error && (
            <div className="mb-3 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center space-x-2 animate-fade-in">
              <div className="w-5 h-5 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSend} className="flex space-x-3">
            <div className="flex-1 relative">
              <input
                className="w-full border border-gray-200 focus:border-blue-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 placeholder-gray-500 bg-white/90 backdrop-blur-sm shadow-lg transition-all duration-300"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your symptoms, ask questions..."
                disabled={loading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl px-6 py-3 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>

          {/* Compact Detected Symptoms */}
          {metadata.detected_symptoms?.length > 0 && (
            <div className="mt-3 hidden sm:block p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-blue-800 text-sm font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Detected Symptoms
                </h4>
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full font-medium">
                  {metadata.detected_symptoms.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {metadata.detected_symptoms.slice(0, 3).map((symptom, i) => (
                  <span 
                    key={i} 
                    className="text-sm text-blue-800 bg-white border border-blue-200 px-3 py-1 rounded-full font-medium"
                  >
                    {symptom}
                  </span>
                ))}
                {metadata.detected_symptoms.length > 3 && (
                  <span className="text-sm text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full font-medium">
                    +{metadata.detected_symptoms.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Compact Quick Actions */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            <button 
              onClick={handleGeneratePrescription}
              disabled={loadingPrescription || (metadata.stage.toLowerCase() !== "recommendations" && metadata.stage.toLowerCase() !== "follow_up")}
              className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              {loadingPrescription ? (
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span>💊</span>
              )}
              <span className="hidden sm:inline">
                {loadingPrescription ? "Generating..." : "Prescription"}
              </span>
              {prescription && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </button>
            <button className="bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 text-xs">
              <span>🏥</span>
              <span className="hidden sm:inline">Doctors</span>
            </button>
            <a href="https://112.gov.in/" target="_blank" rel="noopener noreferrer" className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 text-xs">
              <span>🚨</span>
              <span className="hidden sm:inline">SOS</span>
            </a>
          </div>

          {/* Prescription Error */}
          {prescriptionError && (
            <div className="mt-3 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center space-x-2 animate-fade-in">
              <div className="w-5 h-5 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm">{prescriptionError}</span>
            </div>
          )}

          {/* Prescription Link */}
          {prescription && (
            <div className="mt-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💊</span>
                  <div>
                    <h3 className="text-green-800 text-sm font-semibold">Prescription Generated</h3>
                    <p className="text-green-600 text-xs">Your AI-generated prescription is ready</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrescriptionModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center space-x-1 font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Prescription</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={() => {
          setShowApiKeyModal(false);
          setError('');
        }}
      />

      {/* Prescription Modal */}
      <PrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={() => setShowPrescriptionModal(false)}
        prescription={prescription}
      />
    </div>
  );
}
