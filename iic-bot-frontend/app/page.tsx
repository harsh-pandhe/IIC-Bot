"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  sources?: string[];
  followUps?: string[];
  rating?: number;
  timestamp: Date;
}

interface User {
  username: string;
  role: string;
  name: string;
  permissions?: string[];
}

interface Analytics {
  totalQuestions: number;
  totalRatings: number;
  averageRating: string;
  avgResponseTime: number;
  topQuestions: Array<{ question: string; count: number }>;
  topSources: Array<{ source: string; count: number }>;
  byRole: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SUGGESTED_QUESTIONS = [
  { icon: "👤", text: "Duties of Student President" },
  { icon: "⚠️", text: "Penalties for non-compliance" },
  { icon: "📅", text: "Event planning process" },
  { icon: "🎯", text: "Vice President responsibilities" },
  { icon: "💻", text: "Technical Head duties" },
  { icon: "📝", text: "Documentation requirements" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const formatSourceName = (source: string): string => {
  return source
    .split("/")
    .pop()
    ?.split("\\")
    .pop()
    ?.replace(/\.(pdf|txt|docx?)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/SOP\s*/gi, "")
    .trim() || source;
};

const formatMessage = (text: string) => {
  const lines = text.split("\n");

  return lines.map((line, i) => {
    // Handle numbered items with bold headers
    const numberedMatch = line.match(/^(\d+)\.\s+\*\*(.*?)\*\*:?\s*(.*)/);
    if (numberedMatch) {
      return (
        <div key={i} className="flex gap-3 mb-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 text-xs flex items-center justify-center font-bold border border-blue-500/30">
            {numberedMatch[1]}
          </span>
          <div className="flex-1">
            <span className="font-semibold text-white">{numberedMatch[2]}</span>
            {numberedMatch[3] && (
              <span className="text-slate-300">: {numberedMatch[3]}</span>
            )}
          </div>
        </div>
      );
    }

    // Handle bullet points
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ") || line.trim().startsWith("* ")) {
      const bulletContent = line.trim().replace(/^[-•*]\s*/, "");
      const boldParts = bulletContent.split(/(\*\*.*?\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      );
      return (
        <div key={i} className="ml-3 text-slate-300 text-sm mb-2 flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
          <span>{boldParts}</span>
        </div>
      );
    }

    // Handle Responsible/Role lines
    if (line.trim().toLowerCase().startsWith("responsible:") || line.trim().toLowerCase().startsWith("role:")) {
      return (
        <div key={i} className="ml-3 text-slate-400 text-sm mb-2 flex items-center gap-2 bg-slate-800/30 px-3 py-1.5 rounded-lg w-fit">
          <span className="text-purple-400">👤</span>
          <span>{line.trim()}</span>
        </div>
      );
    }

    // Handle warning/penalty lines
    if (line.includes("⚠️") || line.toLowerCase().includes("penalty")) {
      return (
        <div key={i} className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg mb-2 text-red-300">
          {line}
        </div>
      );
    }

    // Parse bold text
    const boldParts = line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        part
      )
    );

    return line.trim() ? (
      <p key={i} className="mb-2 leading-relaxed">
        {boldParts}
      </p>
    ) : (
      <div key={i} className="h-2" />
    );
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function LoginModal({
  onLogin,
  onClose
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.username || !form.password) {
      setError("Please enter both username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onLogin(form.username, form.password);
    } catch {
      setError("Invalid credentials");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-b from-[#1a2235] to-[#151c2c] p-4 sm:p-6 rounded-2xl border border-slate-700/50 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Welcome Back</h2>
            <p className="text-xs text-slate-400">Sign in to your IIC account</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
          <input
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <input
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </form>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-slate-700/50 text-slate-300 rounded-xl text-sm hover:bg-slate-600/50 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsModal({
  analytics,
  onClose
}: {
  analytics: Analytics;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-b from-[#1a2235] to-[#151c2c] p-4 sm:p-6 rounded-2xl border border-slate-700/50 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Analytics Dashboard</h2>
              <p className="text-xs text-slate-400">Usage statistics and insights</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {analytics.totalQuestions}
            </p>
            <p className="text-xs text-slate-400 mt-1">Total Questions</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
            <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              {analytics.averageRating}
            </p>
            <p className="text-xs text-slate-400 mt-1">Avg Rating</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
            <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {analytics.avgResponseTime}ms
            </p>
            <p className="text-xs text-slate-400 mt-1">Avg Response Time</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
            <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {analytics.totalRatings}
            </p>
            <p className="text-xs text-slate-400 mt-1">Total Ratings</p>
          </div>
        </div>

        {/* Top Questions */}
        {analytics.topQuestions?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-blue-400">📊</span> Most Asked Questions
            </h3>
            <div className="space-y-2">
              {analytics.topQuestions.slice(0, 5).map((q, i) => (
                <div key={i} className="bg-slate-800/30 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-slate-300 truncate flex-1">{q.question}</span>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full ml-2">
                    {q.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Sources */}
        {analytics.topSources?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-purple-400">📄</span> Most Referenced SOPs
            </h3>
            <div className="flex flex-wrap gap-2">
              {analytics.topSources.map((s, i) => (
                <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full border border-purple-500/30">
                  {formatSourceName(s.source)} ({s.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Usage by Role */}
        {Object.keys(analytics.byRole || {}).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-green-400">👥</span> Usage by Role
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.byRole).map(([role, count]) => (
                <span key={role} className="text-xs bg-green-500/20 text-green-300 px-3 py-1.5 rounded-full border border-green-500/30">
                  {role}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StarRating({
  rating,
  onRate
}: {
  rating?: number;
  onRate: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-500 mr-2">Rate:</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`text-lg transition-all transform hover:scale-110 ${(hover || rating || 0) >= star
            ? "text-yellow-400"
            : "text-slate-600 hover:text-yellow-400/50"
            }`}
        >
          ★
        </button>
      ))}
      {rating && (
        <span className="text-xs text-green-400 ml-2 animate-fadeIn">
          ✓ Thanks!
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load saved data on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("iic-chat-history");
    const savedUser = localStorage.getItem("iic-user");

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch {
        // Invalid data, clear it
        localStorage.removeItem("iic-chat-history");
      }
    }

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("iic-user");
      }
    }
  }, []);

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("iic-chat-history", JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleLogin = async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success) {
      setUser(data.user);
      localStorage.setItem("iic-user", JSON.stringify(data.user));
      localStorage.setItem("auth_token", data.token);
      setShowLogin(false);
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("iic-user");
    localStorage.removeItem("auth_token");
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });
      const data = await res.json();
      setAnalytics(data);
      setShowAnalytics(true);
    } catch {
      console.error("Failed to fetch analytics");
    }
  };

  const rateMessage = async (messageId: string, rating: number) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, rating } : m))
    );

    try {
      await fetch(`${API_URL}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: messageId, rating }),
      });
    } catch {
      console.error("Failed to submit rating");
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem("iic-chat-history");
  };

  const sendMessage = useCallback(async (questionOverride?: string) => {
    const question = questionOverride || input;
    if (!question.trim() || loading) return;

    // Require login to chat
    if (!user) {
      setShowLogin(true);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    // Add user message to state first
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    // Format chat history for context (last 6 messages)
    const recentHistory = updatedMessages
      .slice(-6)
      .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          userRole: user?.role,
          history: recentHistory
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let sources: string[] = [];
      let followUps: string[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "sources") sources = data.sources;
                if (data.type === "content") {
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                }
                if (data.type === "followUps") followUps = data.followUps;
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: fullContent,
        sources,
        followUps,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
      setStreamingContent("");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "bot",
          content: "❌ Error connecting to server. Please make sure the backend is running.",
          timestamp: new Date(),
        },
      ]);
    }

    setLoading(false);
  }, [input, loading, user?.role]);

  const canViewAnalytics = user?.role === "Administrator" || user?.permissions?.includes("analytics");

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full py-3 sm:py-4 px-3 sm:px-4 border-b border-slate-800/50 bg-[#0d1321]/95 backdrop-blur-xl shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0d1321] animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent truncate">
                IIC Compliance Officer
              </h1>
              <p className="text-xs text-slate-500 truncate">
                {user ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {user.name} • {user.role}
                  </span>
                ) : (
                  "Login Required"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {canViewAnalytics && (
              <button
                onClick={fetchAnalytics}
                className="p-2 sm:px-3 sm:py-2 text-xs bg-purple-500/10 text-purple-300 rounded-lg hover:bg-purple-500/20 border border-purple-500/20 transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden sm:inline">Analytics</span>
              </button>
            )}

            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-2 sm:px-3 sm:py-2 text-xs bg-red-500/10 text-red-300 rounded-lg hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="px-2 sm:px-3 py-2 text-xs bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 border border-slate-600/50 transition-all"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="px-3 sm:px-4 py-2 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/25"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      {showLogin && (
        <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />
      )}

      {showAnalytics && analytics && (
        <AnalyticsModal analytics={analytics} onClose={() => setShowAnalytics(false)} />
      )}

      {/* Chat Container */}
      <main className="relative flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto pt-16 sm:pt-20">
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 scrollbar-thin">
          {/* Login Required State */}
          {!user && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-16 px-4 animate-fadeIn">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-600/20 flex items-center justify-center border border-slate-700/30 mb-4 sm:mb-6 shadow-lg shadow-red-500/10">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                Authentication Required
              </h2>
              <p className="text-slate-400 text-sm max-w-md mb-6 sm:mb-8 leading-relaxed">
                You must log in to access the IIC Compliance Officer.
                Please click the Login button above to continue.
              </p>

              <button
                onClick={() => setShowLogin(true)}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/25 font-semibold"
              >
                Login to Continue
              </button>
            </div>
          )}

          {/* Empty State (After Login) */}
          {user && messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-16 px-4 animate-fadeIn">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center border border-slate-700/30 mb-4 sm:mb-6 shadow-lg shadow-blue-500/10">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                IIC Compliance Officer
              </h2>
              <p className="text-slate-400 text-sm max-w-md mb-6 sm:mb-8 leading-relaxed">
                Ask about SOPs, responsibilities, penalties, and compliance rules.
                Get authoritative answers from official documentation.
              </p>

              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full max-w-2xl">
                {SUGGESTED_QUESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.text)}
                    className="p-3 sm:p-4 text-left bg-slate-800/30 hover:bg-slate-800/50 text-slate-300 rounded-lg sm:rounded-xl border border-slate-700/30 transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 group"
                  >
                    <span className="text-xl sm:text-2xl mb-1.5 sm:mb-2 block group-hover:scale-110 transition-transform">
                      {s.icon}
                    </span>
                    <span className="text-xs leading-relaxed">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
            >
              <div className={`flex items-start gap-2 sm:gap-3 max-w-[95%] sm:max-w-[90%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${msg.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                    : "bg-gradient-to-br from-purple-500 to-purple-600"
                    }`}
                >
                  {msg.role === "user" ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                </div>

                {/* Message Content */}
                <div
                  className={`rounded-xl sm:rounded-2xl overflow-hidden ${msg.role === "user"
                    ? "px-3 py-2.5 sm:px-5 sm:py-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm shadow-lg shadow-blue-500/20"
                    : "bg-[#151c2c] text-slate-200 border border-slate-700/50 rounded-tl-sm shadow-lg"
                    }`}
                >
                  {msg.role === "user" ? (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <div>
                      <div className="px-3 py-3 sm:px-5 sm:py-4 text-sm leading-relaxed">
                        {formatMessage(msg.content)}
                      </div>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="px-3 py-2.5 sm:px-5 sm:py-3 border-t border-slate-700/50 bg-slate-800/30">
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Sources:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((s, i) => (
                              <span
                                key={i}
                                className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg"
                              >
                                {formatSourceName(s)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rating */}
                      <div className="px-3 py-2.5 sm:px-5 sm:py-3 border-t border-slate-700/50 flex items-center justify-between">
                        <StarRating
                          rating={msg.rating}
                          onRate={(rating) => rateMessage(msg.id, rating)}
                        />
                      </div>

                      {/* Follow-ups */}
                      {msg.followUps && msg.followUps.length > 0 && (
                        <div className="px-3 py-2.5 sm:px-5 sm:py-3 border-t border-slate-700/50">
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Related questions:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.followUps.map((q, i) => (
                              <button
                                key={i}
                                onClick={() => sendMessage(q)}
                                className="text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-3 py-1.5 rounded-lg transition-all"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming Message */}
          {loading && streamingContent && (
            <div className="flex justify-start animate-fadeIn">
              <div className="flex items-start gap-2 sm:gap-3 max-w-[95%] sm:max-w-[90%]">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="px-3 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl rounded-tl-sm bg-[#151c2c] border border-slate-700/50 text-sm text-slate-200 leading-relaxed shadow-lg">
                  {formatMessage(streamingContent)}
                  <span className="inline-block w-2 h-5 bg-blue-400 animate-pulse ml-1 rounded-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && !streamingContent && (
            <div className="flex justify-start animate-fadeIn">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="px-3 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl rounded-tl-sm bg-[#151c2c] border border-slate-700/50 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-sm text-slate-400 ml-2">Analyzing SOPs...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative p-3 sm:p-4 border-t border-slate-800/50 bg-[#0d1321]/80 backdrop-blur-xl">
          {/* Quick Follow-ups */}
          {messages.length > 0 && messages[messages.length - 1]?.followUps && (
            <div className="mb-2 sm:mb-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {messages[messages.length - 1].followUps?.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="whitespace-nowrap bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-full transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="text-blue-400">→</span>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 sm:gap-3 bg-[#151c2c] rounded-xl sm:rounded-2xl border border-slate-700/50 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-lg">
            <input
              className="flex-1 px-3 py-3 sm:px-5 sm:py-4 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={user ? "Ask about SOPs, rules, or responsibilities..." : "Please login to start chatting..."}
              disabled={loading || !user}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || !user}
              className="m-1.5 sm:m-2 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 disabled:shadow-none"
            >
              {loading ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 text-center mt-2 sm:mt-3">
            {user ? (
              <span className="hidden sm:inline">{`Press Enter to send • Logged in as ${user.name}`}</span>
            ) : (
              "Please login to start chatting"
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
