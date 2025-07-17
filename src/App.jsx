import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react'
import DoctorChat from './components/DoctorChat';
import ChatInterface from './components/ChatInterface';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GeminiApiKeyProvider } from './contexts/GeminiApiKeyContext';
import AuthModal from './components/AuthModal';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function Landing() {
  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-200/30 to-indigo-200/30 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-200/30 to-purple-200/30 blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-200/20 to-blue-200/20 blur-2xl"></div>
      </div>

      {/* Header Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-bold">D</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">DocOnGo</span>
        </div>
        
        {user ? (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-gray-700 font-medium">Hello, {user.name}</span>
            </div>
            <button 
              onClick={logout}
              className="bg-white/70 backdrop-blur-sm hover:bg-white/90 text-gray-700 px-6 py-2 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowAuthModal(true)}
            className="bg-white/70 backdrop-blur-sm hover:bg-white/90 text-gray-700 px-6 py-2 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            Login / Sign Up
          </button>
        )}
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 text-center">
        {/* Hero Icon */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-300">
            <span className="text-6xl">🩺</span>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full animate-pulse"></div>
        </div>

        {/* Hero Text */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Your AI Doctor
          </span>
          <br />
          <span className="text-gray-800">Available 24/7</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl leading-relaxed">
          Get instant medical guidance powered by advanced AI. From symptom checking to health advice, 
          your virtual doctor is always ready to help.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <a 
            href="/chat" 
            className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-8 rounded-2xl text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 inline-flex items-center justify-center gap-3"
          >
            <span>Start Consultation</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
          
          {user && (
            <a 
              href="/chat" 
              className="group bg-white/70 backdrop-blur-sm hover:bg-white/90 text-gray-700 font-semibold py-4 px-8 rounded-2xl text-lg transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>View Chat History</span>
            </a>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="bg-white/70 flex flex-col backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Instant Responses</h3>
            <p className="text-gray-600">Get immediate medical guidance without waiting for appointments.</p>
          </div>

          <div className="bg-white/70 flex flex-col backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Secure & Private</h3>
            <p className="text-gray-600">Your health information is protected with enterprise-grade security.</p>
          </div>

          <div className="bg-white/70 flex flex-col backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">24/7 Available</h3>
            <p className="text-gray-600">Access medical guidance anytime, anywhere, day or night.</p>
          </div>
        </div>

        {/* Status */}
        <div className="mt-12 flex items-center justify-center space-x-2 text-gray-600">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            {user ? "Logged in • Conversations saved automatically" : "No registration required • Start chatting immediately"}
          </span>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}

function App() {
  const [count, setCount] = useState(0)

  return (
    <AuthProvider>
      <GeminiApiKeyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/doc" element={<DoctorChat />} />
            <Route path="/chat" element={<ChatInterface />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </GeminiApiKeyProvider>
    </AuthProvider>
  );
}

export default App
