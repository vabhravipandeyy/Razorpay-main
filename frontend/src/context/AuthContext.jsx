import { createContext, useContext, useState, useEffect } from "react";
import { loginApi, registerApi, getMeApi, logoutApi } from "../api/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Synchronously read cached user from localStorage to eliminate page loading delays
    const [user, setUser] = useState(() => {
        try {
            const cached = localStorage.getItem("user");
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });

    const [loading, setLoading] = useState(() => {
        const token = localStorage.getItem("token");
        const cached = localStorage.getItem("user");
        // If we already have token and cached user, don't block page render
        return Boolean(token && !cached);
    });

    const verifySession = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setUser(null);
            localStorage.removeItem("user");
            setLoading(false);
            return;
        }

        try {
            const currentUser = await getMeApi();
            if (currentUser) {
                setUser(currentUser);
                localStorage.setItem("user", JSON.stringify(currentUser));
            }
        } catch (err) {
            // ONLY log out if the server explicitly rejects the token with 401 Unauthorized
            if (err?.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setUser(null);
            }
            // For network errors or temporary timeouts, preserve cached user so session does not expire prematurely
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        verifySession();
    }, []);

    const login = async (username, password) => {
        const data = await loginApi({ username, password });
        if (data?.access_token) {
            localStorage.setItem("token", data.access_token);
        }
        if (data?.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            setUser(data.user);
        }
        return data;
    };

    const register = async (userData) => {
        const newUser = await registerApi(userData);
        return newUser;
    };

    const logout = async () => {
        try {
            await logoutApi();
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                isAuthenticated: !!user,
                isAdmin: user?.role === "admin",
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
