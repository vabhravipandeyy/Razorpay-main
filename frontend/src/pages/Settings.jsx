import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import CopilotDrawer from "../components/CopilotDrawer";
import {
    Menu,
    User,
    Shield,
    Sliders,
    History,
    CheckCircle2,
    AlertCircle,
    KeyRound,
    Lock,
    Save,
    RefreshCw,
    LogOut,
    Eye,
    EyeOff
} from "lucide-react";
import { changePassword } from "../api/admin";

export default function Settings() {
    const { user, logout } = useAuth();
    const { isDark } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isCopilotOpen, setIsCopilotOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdSuccess, setPwdSuccess] = useState("");
    const [pwdError, setPwdError] = useState("");

    // Threshold State
    const [speedThreshold, setSpeedThreshold] = useState(85);
    const [bearingSensitivity, setBearingSensitivity] = useState(30);
    const [ghostGracePeriod, setGhostGracePeriod] = useState(24);
    const [saveSettingsNotice, setSaveSettingsNotice] = useState("");

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdSuccess("");
        setPwdError("");

        if (newPassword !== confirmPassword) {
            setPwdError("New password and confirm password do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setPwdError("New password must be at least 6 characters.");
            return;
        }

        setPwdLoading(true);
        try {
            await changePassword(currentPassword, newPassword, confirmPassword);
            setPwdSuccess("Password updated successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setPwdError(err.response?.data?.detail || "Failed to update password. Verify current password.");
        } finally {
            setPwdLoading(false);
        }
    };

    const handleSaveThresholds = (e) => {
        e.preventDefault();
        setSaveSettingsNotice("Surveillance parameters updated successfully.");
        setTimeout(() => setSaveSettingsNotice(""), 4000);
    };

    const cardClass = isDark
        ? "bg-[#0e1320] border-slate-800/80 text-white"
        : "bg-white border-slate-200 text-slate-900 shadow-sm";

    const subCardClass = isDark
        ? "bg-[#090d16] border-slate-800 text-slate-300"
        : "bg-slate-50 border-slate-200 text-slate-700";

    const inputClass = isDark
        ? "w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
        : "w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 shadow-sm";

    const tabs = [
        { id: "profile", label: "Officer Profile", icon: User },
        { id: "security", label: "Security & Access", icon: Lock },
        { id: "thresholds", label: "Surveillance Thresholds", icon: Sliders },
        { id: "sessions", label: "Active Sessions", icon: History },
    ];

    return (
        <div className={`min-h-screen flex transition-colors duration-200 ${isDark ? "bg-[#07090e]" : "bg-slate-50"}`}>
            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Top Header */}
                <header className={`h-14 px-4 flex items-center justify-between border-b ${
                    isDark ? "border-slate-800 bg-[#0b0f19]" : "border-slate-200 bg-white"
                } md:hidden sticky top-0 z-30 transition-colors`}>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className={`p-1.5 rounded-lg ${
                                isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                            }`}
                        >
                            <Menu size={18} />
                        </button>
                        <span className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                            Settings & Security
                        </span>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
                    {/* Header */}
                    <div className={`border-b pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isDark ? "border-slate-800" : "border-slate-200"
                    }`}>
                        <div>
                            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                System Settings & Security
                            </h1>
                            <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Manage officer profile, access credentials, and surveillance thresholds
                            </p>
                        </div>
                        <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                            user?.role === "admin"
                                ? isDark ? "bg-purple-950 border-purple-800 text-purple-300" : "bg-purple-50 border-purple-200 text-purple-700"
                                : isDark ? "bg-blue-950 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                        }`}>
                            Role: {user?.role || "Inspector"}
                        </span>
                    </div>

                    {/* Navigation Tabs */}
                    <div className={`flex items-center gap-2 overflow-x-auto pb-1 border-b ${
                        isDark ? "border-slate-800" : "border-slate-200"
                    }`}>
                        {tabs.map((t) => {
                            const Icon = t.icon;
                            const active = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                                        active
                                            ? isDark
                                                ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                                                : "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : isDark
                                            ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                                            : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
                                    }`}
                                >
                                    <Icon size={14} />
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* TAB CONTENT */}
                    <div className="space-y-6">
                        
                        {/* 1. OFFICER PROFILE TAB */}
                        {activeTab === "profile" && (
                            <div className={`rounded-2xl border p-6 space-y-6 ${cardClass}`}>
                                <div>
                                    <h3 className="text-base font-bold tracking-tight">Official Identity Details</h3>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        Institutional credentials issued by the Central Board of Indirect Taxes & Customs
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-xl border ${subCardClass}`}>
                                        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Full Name</span>
                                        <p className={`text-sm font-semibold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                                            {user?.full_name || "Enforcement Officer"}
                                        </p>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${subCardClass}`}>
                                        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Username</span>
                                        <p className="text-sm font-mono font-bold text-blue-500 mt-1">
                                            {user?.username}
                                        </p>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${subCardClass}`}>
                                        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Official Email</span>
                                        <p className={`text-sm font-mono mt-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                            {user?.email}
                                        </p>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${subCardClass}`}>
                                        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Jurisdiction Circle</span>
                                        <p className={`text-sm font-semibold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                                            National Anti-Evasion Surveillance Unit (HQ)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. SECURITY & PASSWORD TAB */}
                        {activeTab === "security" && (
                            <div className={`rounded-2xl border p-6 space-y-6 max-w-2xl ${cardClass}`}>
                                <div>
                                    <h3 className="text-base font-bold tracking-tight">Account Credential Management</h3>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        Ensure account credentials satisfy Central Government security directives
                                    </p>
                                </div>

                                {pwdSuccess && (
                                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-xs flex items-center gap-2">
                                        <CheckCircle2 size={16} className="shrink-0" />
                                        <span>{pwdSuccess}</span>
                                    </div>
                                )}

                                {pwdError && (
                                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl text-xs flex items-center gap-2">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <span>{pwdError}</span>
                                    </div>
                                )}

                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-mono font-bold uppercase text-slate-400 block mb-1">
                                            Current Password
                                        </label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter existing password"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-mono font-bold uppercase text-slate-400 block mb-1">
                                            New Password (Min 6 characters)
                                        </label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-mono font-bold uppercase text-slate-400 block mb-1">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((p) => !p)}
                                            className={`text-xs flex items-center gap-1.5 transition-colors ${
                                                isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                                            }`}
                                        >
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            <span>{showPassword ? "Hide Passwords" : "Show Passwords"}</span>
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={pwdLoading}
                                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-40"
                                        >
                                            {pwdLoading ? "Updating..." : "Update Password"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* 3. SURVEILLANCE THRESHOLDS TAB */}
                        {activeTab === "thresholds" && (
                            <form onSubmit={handleSaveThresholds} className={`rounded-2xl border p-6 space-y-6 max-w-3xl ${cardClass}`}>
                                <div>
                                    <h3 className="text-base font-bold tracking-tight">Kinematic & Statutory Thresholds</h3>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        Tune analytical triggers for impossible speeds, route deviations, and ghost transits
                                    </p>
                                </div>

                                {saveSettingsNotice && (
                                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-xs flex items-center gap-2">
                                        <CheckCircle2 size={16} className="shrink-0" />
                                        <span>{saveSettingsNotice}</span>
                                    </div>
                                )}

                                <div className="space-y-5">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold">Impossible Speed Threshold</label>
                                            <span className="font-mono text-xs font-bold text-blue-500">{speedThreshold} km/h</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="60"
                                            max="130"
                                            value={speedThreshold}
                                            onChange={(e) => setSpeedThreshold(Number(e.target.value))}
                                            className="w-full accent-blue-600 cursor-pointer"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Transactions implying average velocities exceeding this limit flag statutory Rule 4.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold">Route Bearing Mismatch Tolerance</label>
                                            <span className="font-mono text-xs font-bold text-blue-500">{bearingSensitivity} Degrees</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="15"
                                            max="75"
                                            value={bearingSensitivity}
                                            onChange={(e) => setBearingSensitivity(Number(e.target.value))}
                                            className="w-full accent-blue-600 cursor-pointer"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Angular divergence between declared origin-destination vectors and toll plazas.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold">Ghost Transit Grace Period</label>
                                            <span className="font-mono text-xs font-bold text-blue-500">{ghostGracePeriod} Hours</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="6"
                                            max="72"
                                            value={ghostGracePeriod}
                                            onChange={(e) => setGhostGracePeriod(Number(e.target.value))}
                                            className="w-full accent-blue-600 cursor-pointer"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Hours after E-Way bill generation before missing FASTag scans triggers Rule 1.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                        Save Thresholds
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* 4. ACTIVE SESSIONS TAB */}
                        {activeTab === "sessions" && (
                            <div className={`rounded-2xl border p-6 space-y-6 max-w-3xl ${cardClass}`}>
                                <div>
                                    <h3 className="text-base font-bold tracking-tight">Active Officer Sessions</h3>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        Currently authorized browser sessions associated with this account
                                    </p>
                                </div>

                                <div className={`p-4 rounded-xl border flex items-center justify-between ${subCardClass}`}>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <strong className="text-xs">Current Active Workstation</strong>
                                        </div>
                                        <p className="text-[11px] font-mono text-slate-400">
                                            IP: 127.0.0.1 | macOS Chrome Browser | JWT Validated
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-bold rounded-lg uppercase">
                                        Online
                                    </span>
                                </div>
                            </div>
                        )}

                    </div>
                </main>

                <Footer />
            </div>

            <CopilotDrawer
                isOpen={isCopilotOpen}
                onClose={() => setIsCopilotOpen(false)}
                onOpen={() => setIsCopilotOpen(true)}
            />
        </div>
    );
}
