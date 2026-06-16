/* important: Authentication context that manages the current user session.
 * Stores user data and JWT token in localStorage for persistence across page reloads.
 * nota bene: No API call is made on mount — the user is restored from localStorage.
 * This prevents auto-kicking blocked users who are already viewing the page. */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '../api/client';

interface User {
    id: string;
    name: string;
    email: string;
    status: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    // note: Initialize state from localStorage to survive page refreshes.
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    async function login(email: string, password: string) {
        const data = await api('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
