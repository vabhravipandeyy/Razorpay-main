import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
    LogOut,
    Sun,
    Moon,
    X,
    ChevronRight
} from "lucide-react";

export default function Sidebar({ mobileOpen, setMobileOpen }) {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    const isActive = (path) => {
        if (path === "/" && location.pathname === "/") return true;
        if (path !== "/" && location.pathname.startsWith(path)) return true;
        return false;
    };

    const isAdmin = user?.role === "admin";

    const navItems = [
        {
            name: "Audit Intelligence",
            path: "/",
        },
        {
            name: "Command Center",
            path: "/command-center",
        },
        {
            name: "Suspicious Registry",
            path: "/suspicious",
        },
        {
            name: "Investigations",
            path: "/investigations",
        },
        {
            name: "System Settings",
            path: "/settings",
        },
    ];

    if (isAdmin) {
        navItems.push({
            name: "Admin Control",
            path: "/admin",
        });
    }

    const closeMobile = () => {
        if (setMobileOpen) setMobileOpen(false);
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {mobileOpen && (
                <div
                    onClick={closeMobile}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
                />
            )}

            {/* Sidebar Element */}
            <aside
                className={`fixed md:sticky top-0 left-0 h-screen w-64 border-r flex flex-col justify-between shrink-0 p-4 z-50 transition-all duration-200 ${
                    isDark
                        ? "bg-[#0b0f19] border-slate-800/80 text-slate-300"
                        : "bg-white border-slate-200 text-slate-700 shadow-sm"
                } ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                }`}
            >
                {/* Brand & Nav Items */}
                <div className="space-y-6">
                    {/* Brand Identifier */}
                    <div className="flex items-center justify-between px-2 py-2">
                        <Link to="/" onClick={closeMobile} className="flex items-center gap-3 group">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs font-mono border transition-colors ${
                                isDark
                                    ? "bg-slate-800 border-slate-700 text-blue-400 group-hover:border-blue-500/50"
                                    : "bg-slate-100 border-slate-200 text-blue-600 group-hover:border-blue-400"
                            }`}>
                                GST
                            </div>
                            <div>
                                <span className={`text-sm font-bold tracking-tight block ${isDark ? "text-white" : "text-slate-900"}`}>
                                    GST Risk Manager
                                </span>
                                <span className={`text-[10px] font-mono tracking-wider block ${
                                    isDark ? "text-slate-400" : "text-slate-500"
                                }`}>
                                    Logistics Intelligence
                                </span>
                            </div>
                        </Link>

                        {/* Mobile Close Button */}
                        <button
                            type="button"
                            onClick={closeMobile}
                            className={`p-1.5 rounded-lg md:hidden ${
                                isDark ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600"
                            }`}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="space-y-1">
                        <span className={`text-[10px] font-mono uppercase font-semibold px-3 tracking-widest block mb-2 ${
                            isDark ? "text-slate-500" : "text-slate-400"
                        }`}>
                            Surveillance Menu
                        </span>
                        {navItems.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={closeMobile}
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                                        active
                                            ? isDark
                                                ? "bg-slate-800/90 text-white font-semibold border border-slate-700/80 shadow-sm"
                                                : "bg-slate-100 text-slate-900 font-semibold border border-slate-200 shadow-sm"
                                            : isDark
                                            ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        {active && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                        )}
                                        <span className={active ? "font-bold tracking-tight" : "font-medium"}>
                                            {item.name}
                                        </span>
                                    </div>
                                    {active && <ChevronRight size={13} className="text-slate-400" />}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom Section: Theme Switcher, Profile & Logout */}
                <div className={`pt-4 border-t space-y-2.5 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                    
                    {/* Theme Switcher */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                            isDark
                                ? "bg-slate-900/60 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {isDark ? <Moon size={14} className="text-blue-400" /> : <Sun size={14} className="text-amber-500" />}
                            <span>{isDark ? "Dark Theme" : "Light Theme"}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            isDark ? "bg-slate-800 text-slate-300" : "bg-white text-slate-700 border border-slate-200 shadow-sm"
                        }`}>
                            Switch
                        </span>
                    </button>

                    {/* Officer Account Profile Trigger -> Direct to /settings */}
                    {user && (
                        <button
                            type="button"
                            onClick={() => {
                                closeMobile();
                                navigate("/settings");
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl border transition-colors text-left ${
                                isDark
                                    ? "bg-slate-900/60 border-slate-800 hover:bg-slate-800"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            }`}
                        >
                            <div className="flex items-center gap-2.5 truncate">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                                    isDark ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800"
                                }`}>
                                    {(user.username || "AD").slice(0, 2).toUpperCase()}
                                </div>
                                <div className="truncate">
                                    <p className={`text-xs font-semibold truncate leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                        {user.full_name || user.username}
                                    </p>
                                    <p className={`text-[10px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        {isAdmin ? "Administrator" : "Tax Inspector"}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight size={13} className="text-slate-500 shrink-0" />
                        </button>
                    )}

                    {/* Sign Out Button */}
                    <button
                        type="button"
                        onClick={handleLogout}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors ${
                            isDark
                                ? "text-slate-400 hover:text-rose-300 hover:bg-rose-950/20"
                                : "text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                    >
                        <LogOut size={13} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
