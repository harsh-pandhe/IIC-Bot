// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface ChatRequest {
    question: string;
    history?: string;
    sessionId?: string;
}

export interface ChatResponse {
    answer: string;
    sources: string[];
    followUps: string[];
    responseTime: number;
    questionId?: string;
    cached?: boolean;
}

// Get auth token from localStorage
const getToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token');
    }
    return null;
};

// API client with auth headers
const apiClient = {
    async post(endpoint: string, data: any, requiresAuth = false) {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (requiresAuth) {
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }

        return response.json();
    },

    async get(endpoint: string, requiresAuth = false) {
        const headers: HeadersInit = {};

        if (requiresAuth) {
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }

        return response.json();
    }
};

export const api = {
    // Authentication
    login: (credentials: LoginCredentials) =>
        apiClient.post('/login', credentials),

    // Chat
    chat: (data: ChatRequest) =>
        apiClient.post('/chat', data, false),

    // Rating
    rate: (questionId: string, rating: number, feedback?: string) =>
        apiClient.post('/rate', { questionId, rating, feedback }, false),

    // Analytics (requires auth)
    getAnalytics: () =>
        apiClient.get('/analytics', true),

    // Learned content (requires auth)
    getLearnedContent: () =>
        apiClient.get('/learned', true),

    // Chat history (requires auth)
    getChatHistory: (sessionId?: string) =>
        apiClient.get(sessionId ? `/history?sessionId=${sessionId}` : '/history', true),

    // Clear cache (requires auth)
    clearCache: () =>
        apiClient.post('/cache/clear', {}, true),

    // Health check
    health: () =>
        apiClient.get('/health', false),
};

export default api;
