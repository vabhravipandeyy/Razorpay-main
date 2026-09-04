import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";
import { ShieldAlert, LayoutDashboard, Database, LogOut, User, Sparkles, ShieldCheck, Briefcase, Activity } from "lucide-react";

export default function Navbar({ onToggleCopilot }) {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const isActive = (path) => location.pathname === path;

    return (
        <>
            <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Brand & Track Identity */}
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400 group-hover:bg-blue-600/30 transition-all shadow-md shadow-blue-500/10">
                                <ShieldAlert size={22} className="text-blue-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-base sm:text-lg font-black tracking-tight text-white">
                                        GST Risk Manager
                                    </span>
                                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                        <Sparkles size={10} /> AI Risk Manager
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium hidden md:block">
                                    E-Way Bill & FASTag Anomaly Intelligence
                                </p>
                            </div>
                        </Link>
                    </div>

                    {/* Main Navigation */}
                    <nav className="flex items-center gap-1 sm:gap-2">
                        <Link
                            to="/"
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                isActive("/")
                                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner"
                                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                            }`}
                        >
                            <LayoutDashboard size={16} />
                            <span>Risk Dashboard</span>
                        </Link>

                        <Link
                            to="/command-center"
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                isActive("/command-center")
                                    ? "bg-rose-600/20 text-rose-400 border border-rose-500/30 shadow-inner"
                                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                            }`}
                        >
                            <Activity size={16} />
                            <span>Command Center</span>
                        </Link>

                        <Link
                            to="/suspicious"
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                isActive("/suspicious")
                                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner"
                                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                            }`}
                        >
                            <Database size={16} />
                            <span>Suspicious Registry</span>
                        </Link>

                        <Link
                            to="/investigations"
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                isActive("/investigations")
                                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner"
                                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                            }`}
                        >
                            <Briefcase size={16} />
                            <span>Cases</span>
                        </Link>

                        {isAdmin && (
                            <Link
                                to="/admin"
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                    isActive("/admin")
                                        ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-inner"
                                        : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                                }`}
                            >
                                <ShieldCheck size={16} />
                                <span>Admin Center</span>
                            </Link>
                        )}

                        {onToggleCopilot && (
                            <button
                                onClick={onToggleCopilot}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-all shadow-md shadow-indigo-500/10"
                            >
                                <Sparkles size={15} className="text-indigo-400 animate-pulse" />
                                <span>Risk Copilot</span>
                            </button>
                        )}
                    </nav>

                    {/* User Session & Actions */}
                    <div className="flex items-center gap-3">
                        {user && (
                            <button
                                onClick={() => setIsProfileOpen(true)}
                                className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-xs transition-colors"
                            >
                                <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                                    <User size={13} />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-white leading-tight">
                                        {user.full_name || user.username}
                                    </p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                                        {isAdmin ? "Administrator" : "Tax Inspector"}
                                    </p>
                                </div>
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            title="Sign Out"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-800/50 transition-all"
                        >
                            <LogOut size={15} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {isProfileOpen && (
                <ProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    user={user}
                />
            )}
        </>
    );
}
