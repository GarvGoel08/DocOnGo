import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react'
import DoctorChat from './components/DoctorChat';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 text-center">
      <div className="mb-4">
        <span className="text-5xl md:text-6xl">🩺</span>
      </div>
      <h1 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">Welcome to DocOnGo</h1>
      <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-lg">
        Your AI-powered doctor is ready to help you anytime, anywhere. Get medical guidance 24/7.
      </p>
      <a 
        href="/doc" 
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-8 rounded-lg text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-flex items-center gap-2"
      >
        Start Doctor Chat
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </a>
      <p className="mt-8 text-gray-600 text-sm">No registration required. Start chatting immediately.</p>
    </div>
  );
}

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/doc" element={<DoctorChat />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
