import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import CopilotDrawer from "../components/CopilotDrawer";

import {
    getAdminOverview,
    getAdminUsers,
    createAdminUser,
    updateUserStatus,
    updateUserRole,
    getAuditLogs,
    getSystemHealth,
    triggerMLTraining,
    triggerBatchSync
} from "../api/admin";

import {
    ShieldCheck,
    Users,
    FileText,
    Activity,
    Database,
    RefreshCw,
    Search,
    UserPlus,
    CheckCircle2,
    AlertCircle,
    Server,
    Menu,
    Sun,
    Moon
} from "lucide-react";

export default function AdminControlCenter() {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [copilotOpen, setCopilotOpen] = useState(false);

    const [activeTab, setActiveTab] = useState("overview"); // "overview" | "users" | "audit" | "ai_ml" | "system"
    const [overview, setOverview] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [auditData, setAuditData] = useState({ total: 0, logs: [] });
    const [auditActionFilter, setAuditActionFilter] = useState("");
    const [systemHealth, setSystemHealth] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Create User Modal State
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newFullName, setNewFullName] = useState("");
    const [newRole, setNewRole] = useState("inspector");
    const [createLoading, setCreateLoading] = useState(false);

    // Operation Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState(null);

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const data = await getAdminOverview();
            setOverview(data);
        } catch (err) {
            setErrorMsg("Failed to load admin overview statistics.");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await getAdminUsers(userSearch);
            setUsersList(data);
        } catch (err) {
            setErrorMsg("Failed to retrieve user registry.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const data = await getAuditLogs({ action: auditActionFilter || undefined, limit: 50 });
            setAuditData(data);
        } catch (err) {
            setErrorMsg("Failed to fetch enterprise audit logs.");
        } finally {
            setLoading(false);
        }
    };

    const fetchHealth = async () => {
        try {
            setLoading(true);
            const data = await getSystemHealth();
            setSystemHealth(data);
        } catch (err) {
            setErrorMsg("Failed to retrieve system health diagnostics.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "overview") fetchOverview();
        if (activeTab === "users") fetchUsers();
        if (activeTab === "audit") fetchAuditLogs();
        if (activeTab === "system") fetchHealth();
    }, [activeTab]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            await createAdminUser({
                username: newUsername,
                email: newEmail,
                password: newPassword,
                full_name: newFullName,
                role: newRole,
            });
            setSuccessMsg(`User '${newUsername}' provisioned successfully.`);
            setIsCreateUserOpen(false);
            setNewUsername("");
            setNewEmail("");
            setNewPassword("");
            setNewFullName("");
            fetchUsers();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to provision user.");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleToggleStatus = async (targetUser) => {
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await updateUserStatus(targetUser.id, !targetUser.is_active);
            setSuccessMsg(res.message);
            fetchUsers();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to update user status.");
        }
    };

    const handleRoleChange = async (targetUser, newRoleValue) => {
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await updateUserRole(targetUser.id, newRoleValue);
            setSuccessMsg(res.message);
            fetchUsers();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to update user role.");
        }
    };

    const handleTriggerML = () => {
        setConfirmModal({
            title: "Retrain Isolation Forest ML Anomaly Model",
            description: "This will extract 14-dimensional feature vectors across all registered vehicle records and retrain the population anomaly model. Continue?",
            onConfirm: async () => {
                try {
                    setConfirmModal(null);
                    setLoading(true);
                    await triggerMLTraining(100, 0.10);
                    setSuccessMsg("ML Anomaly Model retrained successfully.");
                    fetchOverview();
                } catch (err) {
                    setErrorMsg("ML Training failed: " + (err.response?.data?.detail || err.message));
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleTriggerBatchSync = () => {
        setConfirmModal({
            title: "Synchronize All Vehicle Risk Records",
            description: "This will batch evaluate and cache multi-dimensional risk scores, evidence chains, and decision priorities for all vehicles in the database. Continue?",
            onConfirm: async () => {
                try {
                    setConfirmModal(null);
                    setLoading(true);
                    const res = await triggerBatchSync(100);
                    setSuccessMsg(res.message || "Batch synchronization completed successfully.");
                    fetchOverview();
                } catch (err) {
                    setErrorMsg("Batch sync failed: " + (err.response?.data?.detail || err.message));
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const cardClass = isDark
        ? "bg-[#0d121f] border-slate-800/90 text-slate-100 shadow-xl"
        : "bg-white border-slate-200 text-slate-900 shadow-sm";

    const subCardClass = isDark
        ? "bg-[#111827]/70 border-slate-800"
        : "bg-slate-50/80 border-slate-200";

    return (
        <div className={`min-h-screen ${
            isDark ? "bg-[#0b0f19] text-slate-100" : "bg-[#f8fafc] text-slate-900"
        } flex flex-col md:flex-row font-sans antialiased relative transition-colors duration-200`}>
            
            {/* 1. LEFT SIDEBAR */}
            <Sidebar
                onToggleCopilot={() => setCopilotOpen((prev) => !prev)}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            {/* 2. MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                
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
                            Admin Control
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className={`p-1.5 rounded-lg border ${
                                isDark ? "bg-slate-800 border-slate-700 text-emerald-400" : "bg-slate-100 border-slate-200 text-amber-600"
                            }`}
                        >
                            {isDark ? <Moon size={15} /> : <Sun size={15} />}
                        </button>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full space-y-6">
                    
                    {/* Header Title */}
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${
                        isDark ? "border-slate-800/80" : "border-slate-200"
                    }`}>
                        <div className="flex items-center gap-3.5">
                            <div className={`p-2.5 rounded-xl border ${
                                isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200"
                            }`}>
                                <ShieldCheck size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                        Admin Control Center
                                    </h1>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                                        isDark ? "bg-blue-950 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                                    }`}>
                                        Enterprise RBAC
                                    </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                    Enterprise user governance, audit trail verification & ML pipeline orchestration
                                </p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className={`flex items-center gap-1 p-1 rounded-xl border self-start sm:self-auto overflow-x-auto ${
                            isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
                        }`}>
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === "overview"
                                        ? isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                                        : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab("users")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === "users"
                                        ? isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                                        : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Users
                            </button>
                            <button
                                onClick={() => setActiveTab("audit")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === "audit"
                                        ? isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                                        : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Audit Logs
                            </button>
                            <button
                                onClick={() => setActiveTab("ai_ml")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === "ai_ml"
                                        ? isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                                        : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                AI & ML
                            </button>
                            <button
                                onClick={() => setActiveTab("system")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === "system"
                                        ? isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                                        : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Health
                            </button>
                        </div>
                    </div>

                    {/* Alerts */}
                    {successMsg && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                                <span>{successMsg}</span>
                            </div>
                            <button onClick={() => setSuccessMsg("")} className="hover:opacity-70">✕</button>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={15} className="shrink-0 text-rose-500" />
                                <span>{errorMsg}</span>
                            </div>
                            <button onClick={() => setErrorMsg("")} className="hover:opacity-70">✕</button>
                        </div>
                    )}

                    {/* 1. OVERVIEW TAB */}
                    {activeTab === "overview" && loading && !overview && (
                        <Loading variant="dashboard" />
                    )}
                    {activeTab === "overview" && overview && (
                        <div className="space-y-6 animate-in fade-in duration-150">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                                <div className={`rounded-xl border p-4 space-y-0.5 ${subCardClass}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Users</span>
                                    <p className={`text-2xl font-black font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
                                        {overview.user_statistics?.total_users || 0}
                                    </p>
                                    <span className="text-[10px] text-emerald-600 font-semibold block">
                                        {overview.user_statistics?.active_users || 0} Active
                                    </span>
                                </div>

                                <div className={`rounded-xl border p-4 space-y-0.5 ${subCardClass}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Admins</span>
                                    <p className="text-2xl font-black font-mono text-blue-600">
                                        {overview.user_statistics?.admin_count || 0}
                                    </p>
                                    <span className={`text-[10px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        {overview.user_statistics?.inspector_count || 0} Inspectors
                                    </span>
                                </div>

                                <div className={`rounded-xl border p-4 space-y-0.5 ${subCardClass}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Audit Events</span>
                                    <p className="text-2xl font-black font-mono text-purple-600">
                                        {overview.system_statistics?.total_audit_events || 0}
                                    </p>
                                    <span className={`text-[10px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Immutable security log</span>
                                </div>

                                <div className={`rounded-xl border p-4 space-y-0.5 ${subCardClass}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>RAG Chunks</span>
                                    <p className="text-2xl font-black font-mono text-emerald-600">
                                        {overview.system_statistics?.rag_documents_indexed || 0}
                                    </p>
                                    <span className={`text-[10px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>CBIC Guidelines</span>
                                </div>
                            </div>

                            {/* Quick Operation Shortcuts */}
                            <div className={`rounded-2xl border p-5 space-y-4 ${cardClass}`}>
                                <h2 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                    Administrative Shortcuts
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                    <button
                                        onClick={handleTriggerML}
                                        className={`p-4 rounded-xl border text-left transition-all ${subCardClass} hover:border-blue-500`}
                                    >
                                        <div className="flex items-center gap-3">

                                            <div>
                                                <h4 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Retrain ML Model</h4>
                                                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Update Isolation Forest baseline</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleTriggerBatchSync}
                                        className={`p-4 rounded-xl border text-left transition-all ${subCardClass} hover:border-blue-500`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                                <Database size={18} />
                                            </div>
                                            <div>
                                                <h4 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Batch Sync DB</h4>
                                                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Evaluate live vehicle profiles</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setActiveTab("users");
                                            setIsCreateUserOpen(true);
                                        }}
                                        className={`p-4 rounded-xl border text-left transition-all ${subCardClass} hover:border-blue-500`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                                <UserPlus size={18} />
                                            </div>
                                            <div>
                                                <h4 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Provision Officer</h4>
                                                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Add inspector or admin</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. USER MANAGEMENT TAB */}
                    {activeTab === "users" && (
                        <div className={`rounded-2xl border p-5 space-y-4 animate-in fade-in duration-150 ${cardClass}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                        User Registry & Role Governance
                                    </h2>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        Manage tax inspector accounts, role assignments & session statuses
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search officer..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
                                            className={`border rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none w-48 sm:w-56 ${
                                                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                                            }`}
                                        />
                                        <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                                    </div>

                                    <button
                                        onClick={() => setIsCreateUserOpen(true)}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                                    >
                                        <UserPlus size={14} />
                                        <span>Add Officer</span>
                                    </button>
                                </div>
                            </div>

                            {/* User Table */}
                            {loading ? (
                                <Loading variant="table" />
                            ) : (
                                <div className={`overflow-x-auto rounded-xl border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                                <table className={`w-full text-left text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                    <thead className={`uppercase text-[10px] tracking-wider border-b font-mono ${
                                        isDark ? "bg-slate-900/80 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}>
                                        <tr>
                                            <th className="p-3">User Details</th>
                                            <th className="p-3">Official Email</th>
                                            <th className="p-3">Assigned Role</th>
                                            <th className="p-3">Account Status</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-slate-800/80" : "divide-slate-100"}`}>
                                        {usersList.map((u) => (
                                            <tr key={u.id} className={isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}>
                                                <td className="p-3">
                                                    <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{u.full_name || u.username}</div>
                                                    <div className="font-mono text-[11px] text-slate-400">@{u.username}</div>
                                                </td>
                                                <td className="p-3 font-mono">{u.email}</td>
                                                <td className="p-3">
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => handleRoleChange(u, e.target.value)}
                                                        className={`px-2 py-0.5 rounded text-xs font-bold uppercase border outline-none ${
                                                            isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800 shadow-sm"
                                                        }`}
                                                    >
                                                        <option value="inspector">Inspector</option>
                                                        <option value="admin">Administrator</option>
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                                        u.is_active
                                                            ? isDark ? "bg-emerald-950 text-emerald-300 border-emerald-800" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                            : isDark ? "bg-rose-950 text-rose-300 border-rose-800" : "bg-rose-50 text-rose-800 border-rose-200"
                                                    }`}>
                                                        {u.is_active ? "Active" : "Deactivated"}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handleToggleStatus(u)}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                                                            u.is_active
                                                                ? "text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40"
                                                                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/40"
                                                        }`}
                                                    >
                                                        {u.is_active ? "Deactivate" : "Activate"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            )}
                        </div>
                    )}

                    {/* 3. AUDIT LOGS TAB */}
                    {activeTab === "audit" && (
                        <div className={`rounded-2xl border p-5 space-y-4 animate-in fade-in duration-150 ${cardClass}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                        Enterprise Audit Trail
                                    </h2>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        Immutable chronological log of user operations and authorization events
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={auditActionFilter}
                                        onChange={(e) => setAuditActionFilter(e.target.value)}
                                        className={`border rounded-xl px-3 py-1.5 text-xs outline-none ${
                                            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                                        }`}
                                    >
                                        <option value="">All Actions</option>
                                        <option value="LOGIN">LOGIN</option>
                                        <option value="FAILED_LOGIN">FAILED_LOGIN</option>
                                        <option value="USER_CREATED">USER_CREATED</option>
                                        <option value="USER_STATUS_CHANGED">USER_STATUS_CHANGED</option>
                                        <option value="VEHICLE_ANALYZED">VEHICLE_ANALYZED</option>
                                    </select>

                                    <button
                                        onClick={fetchAuditLogs}
                                        className={`p-2 rounded-xl border ${
                                            isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-sm"
                                        }`}
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Audit Table */}
                            {loading ? (
                                <Loading variant="table" />
                            ) : (
                                <div className={`overflow-x-auto rounded-xl border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                                <table className={`w-full text-left text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                    <thead className={`uppercase text-[10px] tracking-wider border-b font-mono ${
                                        isDark ? "bg-slate-900/80 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}>
                                        <tr>
                                            <th className="p-3">Timestamp</th>
                                            <th className="p-3">Officer</th>
                                            <th className="p-3">Action</th>
                                            <th className="p-3">Target</th>
                                            <th className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-slate-800/80" : "divide-slate-100"}`}>
                                        {auditData.logs.map((log) => (
                                            <tr key={log.id} className={isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}>
                                                <td className="p-3 font-mono text-[11px] text-slate-400">
                                                    {log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}
                                                </td>
                                                <td className={`p-3 font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{log.username}</td>
                                                <td className="p-3 font-mono font-bold text-blue-600">{log.action}</td>
                                                <td className="p-3 font-mono text-slate-400">{log.resource_id || "—"}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                        log.status === "SUCCESS"
                                                            ? isDark ? "bg-emerald-950 text-emerald-300 border-emerald-800" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                            : isDark ? "bg-rose-950 text-rose-300 border-rose-800" : "bg-rose-50 text-rose-800 border-rose-200"
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            )}
                        </div>
                    )}

                    {/* 4. AI & ML ENGINE TAB */}
                    {activeTab === "ai_ml" && (
                        <div className={`rounded-2xl border p-5 space-y-4 animate-in fade-in duration-150 ${cardClass}`}>
                            <div>
                                <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                    AI & Machine Learning Engine Administration
                                </h2>
                                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Configure Isolation Forest anomaly baseline & RAG vector store indexing
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-4 rounded-xl border space-y-3 ${subCardClass}`}>
                                    <div className="flex items-center gap-2.5">

                                        <div>
                                            <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Isolation Forest Engine</h3>
                                            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>14-Dimensional Telemetry Outliers</p>
                                        </div>
                                    </div>
                                    <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                        Extracts multidimensional telemetry vectors and benchmarks against population medians.
                                    </p>
                                    <button
                                        onClick={handleTriggerML}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                                    >
                                        Retrain Anomaly Model
                                    </button>
                                </div>

                                <div className={`p-4 rounded-xl border space-y-3 ${subCardClass}`}>
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                            <Database size={18} />
                                        </div>
                                        <div>
                                            <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Batch Risk Sync Engine</h3>
                                            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Pre-computed Risk Database</p>
                                        </div>
                                    </div>
                                    <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                        Re-evaluates statutory criteria and refreshes cached vehicle risk scores.
                                    </p>
                                    <button
                                        onClick={handleTriggerBatchSync}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                                    >
                                        Run Batch Synchronization
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. SYSTEM HEALTH TAB */}
                    {activeTab === "system" && systemHealth && (
                        <div className={`rounded-2xl border p-5 space-y-4 animate-in fade-in duration-150 ${cardClass}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                        System Diagnostics & Microservice Health
                                    </h2>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        Real-time telemetry and database connection states
                                    </p>
                                </div>
                                <button
                                    onClick={fetchHealth}
                                    className={`p-2 rounded-xl border ${
                                        isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-sm"
                                    }`}
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                <div className={`p-4 rounded-xl border space-y-1 ${subCardClass}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Core API Service</span>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className={`text-sm font-bold font-mono ${isDark ? "text-white" : "text-slate-900"}`}>ONLINE (HEALTHY)</span>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl border space-y-1 ${subCardClass}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Database Connectivity</span>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className={`text-sm font-bold font-mono ${isDark ? "text-white" : "text-slate-900"}`}>CONNECTED</span>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl border space-y-1 ${subCardClass}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>RAG Knowledge Base</span>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className={`text-sm font-bold font-mono ${isDark ? "text-white" : "text-slate-900"}`}>INDEXED</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                <Footer />
            </div>

            {/* Create Officer Modal */}
            {isCreateUserOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl border ${
                        isDark ? "bg-[#0e1320] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}>
                        <h3 className="text-base font-bold">Provision Officer Account</h3>
                        <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1">Username *</label>
                                <input
                                    type="text"
                                    required
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-1">Official Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-1">Password *</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-1">Role</label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none"
                                >
                                    <option value="inspector">Inspector</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateUserOpen(false)}
                                    className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                                >
                                    {createLoading ? "Creating..." : "Provision Account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl border ${
                        isDark ? "bg-[#0e1320] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}>
                        <h3 className="text-base font-bold">{confirmModal.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{confirmModal.description}</p>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                            >
                                Confirm Execution
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Risk Copilot Slide-Over Drawer */}
            <CopilotDrawer
                isOpen={copilotOpen}
                onOpen={() => setCopilotOpen(true)}
                onClose={() => setCopilotOpen(false)}
            />
        </div>
    );
}
