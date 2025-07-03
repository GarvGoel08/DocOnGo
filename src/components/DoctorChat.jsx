import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendDoctorMessage, resetDoctorSession, getDoctorSessionStatus } from "../api/doctor";

function randomSessionId() {
  return "sess-" + Math.random().toString(36).slice(2, 12);
}

// Helper function to extract message from JSON if possible
function extractMessageFromJson(text) {
  if (!text) return text;

  // First, try to find if text starts with "json { or ```json { and extract the JSON
  const jsonRegex =
    /(```json\s*|\"{0,1}json\"{0,1}\s*|\s*)?(\{.*\}|\[.*\])(\s*```)?/s;
  const match = text.match(jsonRegex);

  let jsonText = text;
  if (match && match[2]) {
    jsonText = match[2];
  }

  try {
    // Check if it looks like JSON
    if (jsonText.trim().startsWith("{") || jsonText.trim().startsWith("[")) {
      const parsed = JSON.parse(jsonText);

      // Look for message property at any level
      if (parsed) {
        if (parsed.message) {
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
    return text; // Return original if parsing fails
  }
}

// Define stages globally so they're available throughout the component
const CHAT_STAGES = [
  "GREETING",
  "SYMPTOM_COLLECTION",
  "DETAILED_ASSESSMENT",
  "MEDICAL_HISTORY",
  "ANALYSIS",
  "RECOMMENDATIONS",
  "FOLLOW_UP",
];

// Function to calculate stage progress percentage for the progress bar
function getStageProgress(stage) {
  if (!stage) return 10; // Default starting progress

  // Find the stage index by matching text
  const currentIndex = CHAT_STAGES.findIndex(
    (s) =>
      stage.toLowerCase().includes(s.replace(/_/g, "")) ||
      stage.toLowerCase() === s
  );

  if (currentIndex === -1) return 20; // Default progress if not found
  return Math.min(
    100,
    Math.max(10, Math.round(((currentIndex + 1) / CHAT_STAGES.length) * 100))
  );
}

// Function to determine the next stage
function getNextStage(currentStage) {
  if (!currentStage) return CHAT_STAGES[0];

  const currentIndex = CHAT_STAGES.findIndex(
    (s) =>
      currentStage.toLowerCase().includes(s.replace(/_/g, "")) ||
      currentStage.toLowerCase() === s
  );

  if (currentIndex === -1) return currentStage; // Keep current if not found
  if (currentIndex >= CHAT_STAGES.length - 1) return currentStage; // Already at last stage

  return CHAT_STAGES[currentIndex + 1];
}

// Custom animation styles
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
`;

export default function DoctorChat() {
  const [sessionId] = useState(randomSessionId());
  const [messages, setMessages] = useState([
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
  const chatEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check session status on component load
  useEffect(() => {
    async function checkSessionStatus() {
      try {
        const status = await getDoctorSessionStatus(sessionId);
        
        if (status.exists) {
          // Update metadata with session info
          setMetadata({
            stage: status.stage || CHAT_STAGES[0],
            confidence_level: 0.8,
            detected_symptoms: status.detectedSymptoms || [],
            suggested_followup: ""
          });
          
          // Add a message about continuing the conversation
          if (messages.length === 1) {
            setMessages([
              { from: "ai", text: "Hello! I am Dr. AI. I see we were having a conversation. How can I continue helping you today?" }
            ]);
          }
        }
      } catch (error) {
        console.error("Error checking session status:", error);
        // Continue with new session if status check fails
      }
    }
    
    checkSessionStatus();
  }, [sessionId]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setMessages((msgs) => [...msgs, { from: "user", text: input }]);
    setLoading(true);
    setError("");

    const userMsg = input;
    setInput("");

    // Add typing indicator
    setTimeout(() => {
      setMessages((msgs) => [
        ...msgs,
        { from: "ai", text: "", isTyping: true },
      ]);
    }, 500);

    try {
      // Use the API function from the separate API file
      const response = await sendDoctorMessage({ 
        message: userMsg, 
        sessionId 
      });

      // Remove typing indicator before showing real message
      setMessages((msgs) => msgs.filter((m) => !m.isTyping));

      // Add the AI response to messages
      setMessages((msgs) => [
        ...msgs,
        { from: "ai", text: response.message || "I'm processing your request..." }
      ]);
      
      // Update metadata with response info
      setMetadata({
        stage: response.metadata?.current_stage || 'greeting',
        confidence_level: response.metadata?.confidence_level || 0.5,
        detected_symptoms: response.metadata?.detected_symptoms || [],
        suggested_followup: response.metadata?.suggested_followup || ""
      });
      
    } catch (err) {
      console.error(err);
      // Remove typing indicator if there was an error
      setMessages((msgs) => msgs.filter((m) => !m.isTyping));
      setError("Failed to get response. Please try again.");
      
      // Add an error message from the AI
      setMessages((msgs) => [
        ...msgs, 
        { 
          from: "ai", 
          text: "I'm having trouble connecting to my knowledge base. Please try again in a moment." 
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    try {
      // Call the API to reset the session
      await resetDoctorSession(sessionId);
      
      // Reset the local state
      setMessages([
        { from: "ai", text: "Hello! I am Dr. AI. How can I help you today?" },
      ]);
      setError("");
      setMetadata({
        stage: CHAT_STAGES[0],
        confidence_level: 0.95,
        detected_symptoms: [],
        suggested_followup: ""
      });
    } catch (error) {
      console.error("Failed to reset session:", error);
      setError("Failed to reset the conversation. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div className="bg-white max-h-[90vh] rounded-2xl shadow-xl w-full max-w-md md:max-w-xl lg:max-w-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                to="/"
                className="mr-2 p-1 hover:bg-blue-500 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <div className="flex items-center gap-2">
                <span role="img" aria-label="doctor" className="text-2xl">
                  🩺
                </span>
                <span className="text-xl font-semibold">AI Doctor</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-md text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                onClick={handleReset}
                disabled={loading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Stage info */}
        {metadata.stage && (
          <div className="bg-blue-50 text-gray-700 px-4 py-3 text-sm border-b border-gray-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-1">
              <div className="font-medium flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Stage:{" "}
                <span className="text-blue-700 ml-1 capitalize font-semibold">
                  {metadata.stage}
                </span>
              </div>
              {metadata.confidence_level && (
                <div
                  className={`font-medium flex items-center ${
                    metadata.confidence_level > 0.7
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Confidence: {Math.round(metadata.confidence_level * 100)}%
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out"
                style={{
                  width: getStageProgress(metadata.stage) + "%",
                }}
              />
            </div>

            {/* Stage indicators */}
            <div className="flex justify-between mt-1 px-1">
              {CHAT_STAGES.map((stage, idx) => {
                const currentStageIndex = CHAT_STAGES.findIndex(
                  (s) =>
                    metadata.stage
                      ?.toLowerCase()
                      .includes(s.replace(/_/g, "")) ||
                    metadata.stage?.toLowerCase() === s
                );

                return (
                  <div
                    key={stage}
                    className={`text-[9px] uppercase tracking-wider font-medium transition-colors ${
                      idx <= currentStageIndex
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  >
                    {stage.split("_")[0].substring(0, 4)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col">
          {messages.map((msg, i) =>
            msg.isStageTransition ? (
              // Stage transition message
              <div key={i} className="flex justify-center my-3 animate-fade-in">
                <div className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-100 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                  {msg.text}
                </div>
              </div>
            ) : (
              // Regular chat message
              <div
                key={i}
                className={`mb-4 max-w-[85%] break-words p-3 rounded-xl text-base
                  ${
                    msg.from === "user"
                      ? "bg-blue-100 self-end text-gray-800"
                      : "bg-white border border-gray-200 self-start text-gray-700 shadow-sm"
                  }`}
              >
                {msg.isTyping ? (
                  <div className="flex items-center space-x-1">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                ) : (
                  <div>
                    {msg.from === "ai" && (
                      <div className="flex items-center mb-1 text-blue-600 font-medium text-sm">
                        <span className="mr-1">🩺</span> Dr. AI
                      </div>
                    )}
                    {i === 0 && msg.from === "ai" ? (
                      <span>👋 {msg.text}</span>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                    )}
                  </div>
                )}
              </div>
            )
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input form */}
        <form
          className="flex p-4 bg-white border-t border-gray-100"
          onSubmit={handleSend}
        >
          <input
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms..."
            disabled={loading}
            autoFocus
          />
          <button
            className="ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-3 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[4.5rem]"
            type="submit"
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "Send"
            )}
          </button>
        </form>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 mx-4 mb-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Detected symptoms */}
        {metadata.detected_symptoms?.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 m-4 rounded-lg shadow-sm border border-blue-100">
            <h4 className="text-blue-700 text-sm font-medium mb-2 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Detected Symptoms
            </h4>
            <div className="flex flex-wrap gap-2">
              {metadata.detected_symptoms.map((symptom, i) => (
                <span
                  key={i}
                  className="text-sm text-blue-800 bg-blue-100 px-2 py-1 rounded-full inline-flex items-center"
                >
                  <span className="mr-1">•</span> {symptom}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-center text-gray-500 py-2 border-t border-gray-100 bg-gray-50">
          <p>
            DocOnGo AI is for informational purposes only. Not a substitute for
            professional medical advice.
          </p>
          <p className="mt-1 mb-1">
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 underline mx-1"
            >
              Home
            </Link>
            <span className="mx-1">•</span>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-800 underline mx-1"
            >
              Privacy
            </a>
            <span className="mx-1">•</span>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-800 underline mx-1"
            >
              Terms
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
