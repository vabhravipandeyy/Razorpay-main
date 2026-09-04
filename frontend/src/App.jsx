import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SuspiciousVehicles from "./pages/SuspiciousVehicles";
import AdminControlCenter from "./pages/AdminControlCenter";
import Forbidden from "./pages/Forbidden";
import AdminRoute from "./components/AdminRoute";
import InvestigationList from "./pages/InvestigationList";
import InvestigationDetail from "./pages/InvestigationDetail";
import CommandCenter from "./pages/CommandCenter";
import Settings from "./pages/Settings";

const AuthLoading = () => (
    <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center space-y-3">
        <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-[11px] font-mono text-slate-500 tracking-wider uppercase">Loading Portal...</span>
    </div>
);

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <AuthLoading />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <AuthLoading />;
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/command-center"
                element={
                    <ProtectedRoute>
                        <CommandCenter />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/suspicious"
                element={
                    <ProtectedRoute>
                        <SuspiciousVehicles />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/investigations"
                element={
                    <ProtectedRoute>
                        <InvestigationList />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/investigations/:caseId"
                element={
                    <ProtectedRoute>
                        <InvestigationDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <AdminRoute>
                        <AdminControlCenter />
                    </AdminRoute>
                }
            />
                        <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                }
            />
            <Route path="/403" element={<Forbidden />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}
