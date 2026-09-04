import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import CopilotDrawer from "../components/CopilotDrawer";

import { getInvestigationCases, getCaseStatistics, createInvestigationCase } from "../api/investigations";

import {
    Briefcase,
    Search,
    Plus,
    Clock,
    AlertCircle,
    CheckCircle2,
    ShieldAlert,
    ArrowUpRight,
    RefreshCw,
    User,
    ChevronRight,
    Truck,
    Menu,
    Sun,
    Moon
} from "lucide-react";

export default function InvestigationList() {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [copilotOpen, setCopilotOpen] = useState(false);

    const [cases, setCases] = useState([]);
    const [stats, setStats] = useState(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");

    // Create Case Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [vehicleInput, setVehicleInput] = useState("");
    const [titleInput, setTitleInput] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);
            const [casesRes, statsRes] = await Promise.all([
                getInvestigationCases({
                    search: search || undefined,
                    status: statusFilter || undefined,
                    priority: priorityFilter || undefined,
                    limit: 50,
                }),
                getCaseStatistics()
            ]);
            setCases(casesRes.cases || []);
            setTotal(casesRes.total || 0);
            setStats(statsRes);
        } catch (err) {
            console.error("Failed to fetch cases:", err);
            setErrorMsg("Unable to retrieve investigation records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [statusFilter, priorityFilter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchData();
    };

    const handleCreateCase = async (e) => {
        e.preventDefault();
        if (!vehicleInput.trim()) return;

        try {
            setCreateLoading(true);
            setErrorMsg("");
            const res = await createInvestigationCase(vehicleInput.trim(), titleInput.trim() || null);
            setIsCreateOpen(false);
            setVehicleInput("");
            setTitleInput("");
            setSuccessMsg(res.message);
            navigate(`/investigations/${res.case_id}`);
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to create investigation case.");
        } finally {
            setCreateLoading(false);
        }
    };

    const getStatusBadge = (st) => {
        switch (st) {
            case "NEW":
                return isDark ? "bg-blue-950/80 text-blue-300 border-blue-800" : "bg-blue-50 text-blue-800 border-blue-200";
            case "UNDER_REVIEW":
                return isDark ? "bg-amber-950/80 text-amber-300 border-amber-800" : "bg-amber-50 text-amber-800 border-amber-200";
            case "INVESTIGATION":
                return isDark ? "bg-purple-950/80 text-purple-300 border-purple-800" : "bg-purple-50 text-purple-800 border-purple-200";
            case "RESOLVED":
                return isDark ? "bg-emerald-950/80 text-emerald-300 border-emerald-800" : "bg-emerald-50 text-emerald-800 border-emerald-200";
            case "CLOSED":
                return isDark ? "bg-slate-900 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200";
            default:
                return isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    const getPriorityBadge = (p) => {
        if (p === "URGENT" || p === "URGENT_REVIEW") {
            return isDark ? "bg-rose-950 text-rose-300 border-rose-800" : "bg-rose-50 text-rose-800 border-rose-200";
        }
        if (p === "INVESTIGATE" || p === "HIGH") {
            return isDark ? "bg-rose-950 text-rose-300 border-rose-800" : "bg-rose-50 text-rose-800 border-rose-200";
        }
        if (p === "REVIEW" || p === "MEDIUM") {
            return isDark ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-amber-50 text-amber-800 border-amber-200";
        }
        return isDark ? "bg-emerald-950 text-emerald-300 border-emerald-800" : "bg-emerald-50 text-emerald-800 border-emerald-200";
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
                            Investigations
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
                    
                    {/* Header Banner */}
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${
                        isDark ? "border-slate-800/80" : "border-slate-200"
                    }`}>
                        <div className="flex items-center gap-3.5">
                            <div className={`p-2.5 rounded-xl border ${
                                isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200"
                            }`}>
                                <Briefcase size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                                        isDark ? "text-white" : "text-slate-900"
                                    }`}>
                                        Investigation Case Management
                                    </h1>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                                        isDark ? "bg-blue-950 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                                    }`}>
                                        Formal Dockets
                                    </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                    Case tracking, evidence review dossiers, inspector notes & resolution audit trail
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
                        >
                            <Plus size={15} />
                            <span>Open New Case</span>
                        </button>
                    </div>

                    {/* Metrics Cards */}
                    {stats && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Cases</span>
                                <p className={`text-xl font-black font-mono ${isDark ? "text-white" : "text-slate-900"}`}>{stats.total_cases || 0}</p>
                            </div>

                            <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Active Open</span>
                                <p className="text-xl font-black font-mono text-blue-500">{stats.open_cases || 0}</p>
                            </div>

                            <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>In Review</span>
                                <p className="text-xl font-black font-mono text-amber-500">{stats.under_review || 0}</p>
                            </div>

                            <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Investigating</span>
                                <p className="text-xl font-black font-mono text-purple-500">{stats.under_investigation || 0}</p>
                            </div>

                            <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Resolved</span>
                                <p className="text-xl font-black font-mono text-emerald-500">{stats.resolved_cases || 0}</p>
                            </div>

                            <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Closed</span>
                                <p className={`text-xl font-black font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>{stats.closed_cases || 0}</p>
                            </div>
                        </div>
                    )}

                    {/* Filter & Search Bar */}
                    <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardClass}`}>
                        <form onSubmit={handleSearchSubmit} className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search case number (GST-2026-...) or vehicle..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none font-mono ${
                                    isDark
                                        ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                                        : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm"
                                }`}
                            />
                            <Search size={14} className={`absolute left-3 top-2.5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                        </form>

                        <div className="flex items-center gap-2 shrink-0">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={`border text-xs rounded-xl px-3 py-2 outline-none font-mono ${
                                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-sm"
                                }`}
                            >
                                <option value="">All Statuses</option>
                                <option value="NEW">NEW</option>
                                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                                <option value="INVESTIGATION">INVESTIGATION</option>
                                <option value="RESOLVED">RESOLVED</option>
                                <option value="CLOSED">CLOSED</option>
                            </select>

                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className={`border text-xs rounded-xl px-3 py-2 outline-none font-mono ${
                                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-sm"
                                }`}
                            >
                                <option value="">All Priorities</option>
                                <option value="URGENT_REVIEW">URGENT</option>
                                <option value="INVESTIGATE">HIGH</option>
                                <option value="REVIEW">MEDIUM</option>
                                <option value="NORMAL">LOW</option>
                            </select>

                            <button
                                onClick={fetchData}
                                className={`p-2 rounded-xl border transition-colors ${
                                    isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                                }`}
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Cases Table */}
                    {loading ? (
                        <Loading variant="table" />
                    ) : cases.length > 0 ? (
                        <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
                            <div className="overflow-x-auto">
                                <table className={`w-full text-left text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                    <thead className={`uppercase text-[10px] tracking-wider border-b font-mono ${
                                        isDark ? "bg-slate-900/80 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}>
                                        <tr>
                                            <th className="px-4 py-3">Case Docket #</th>
                                            <th className="px-4 py-3">Vehicle Target</th>
                                            <th className="px-4 py-3">Priority</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Assigned Officer</th>
                                            <th className="px-4 py-3">Created</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-slate-800/80" : "divide-slate-100"}`}>
                                        {cases.map((c) => (
                                            <tr key={c.id} className={isDark ? "hover:bg-slate-800/40 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                                                <td className={`px-4 py-3.5 font-mono font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                                    <Link to={`/investigations/${c.id}`} className="hover:underline">
                                                        {c.case_number}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs border ${
                                                        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                                                    }`}>
                                                        {c.vehicle_number}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityBadge(c.priority)}`}>
                                                        {c.priority}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(c.status)}`}>
                                                        {c.status.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 font-medium">
                                                    {c.assigned_to_name || "Unassigned"}
                                                </td>
                                                <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">
                                                    {new Date(c.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <Link
                                                        to={`/investigations/${c.id}`}
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 font-semibold text-xs"
                                                    >
                                                        <span>View Docket</span>
                                                        <ChevronRight size={13} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className={`p-8 text-center rounded-2xl border ${cardClass}`}>
                            <p className="text-xs text-slate-400">No investigation cases found matching current criteria.</p>
                        </div>
                    )}
                </main>

                <Footer />
            </div>

            {/* Create Case Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl border ${
                        isDark ? "bg-[#0e1320] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}>
                        <h3 className="text-lg font-bold">Open Formal Case Docket</h3>
                        <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1">Target Vehicle Number *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. KA01AB1234"
                                    value={vehicleInput}
                                    onChange={(e) => setVehicleInput(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none uppercase font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-1">Docket Title / Memo (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Suspected E-Way Bill circular routing"
                                    value={titleInput}
                                    onChange={(e) => setTitleInput(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                                >
                                    {createLoading ? "Creating..." : "Initialize Docket"}
                                </button>
                            </div>
                        </form>
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
