import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import CopilotDrawer from "../components/CopilotDrawer";
import Loading from "../components/Loading";

import {
    getSuspiciousRecords,
    getAnalysisStats,
    syncVehicleRecords,
} from "../api/analysis";

import {
    Search,
    ShieldAlert,
    AlertTriangle,
    CheckCircle,
    Activity,
    RefreshCw,
    ArrowUpRight,
    FileText,
    CreditCard,
    Calendar,
    Filter,
    ChevronLeft,
    ChevronRight,
    Menu,
    Sun,
    Moon
} from "lucide-react";

export default function SuspiciousVehicles() {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [copilotOpen, setCopilotOpen] = useState(false);

    const [records, setRecords] = useState([]);
    const [stats, setStats] = useState({
        total_records: 0,
        high_risk: 0,
        medium_risk: 0,
        low_risk: 0,
        average_risk_score: 0,
    });
    const [totalRecords, setTotalRecords] = useState(0);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRiskLevel, setSelectedRiskLevel] = useState("");
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            setError("");
            const offset = (currentPage - 1) * pageSize;

            const [recordsData, statsData] = await Promise.all([
                getSuspiciousRecords({
                    search: searchTerm,
                    risk_level: selectedRiskLevel,
                    limit: pageSize,
                    offset: offset,
                }),
                getAnalysisStats(),
            ]);

            setRecords(recordsData.records || []);
            setTotalRecords(recordsData.total || 0);
            if (statsData) {
                setStats(statsData);
            }
        } catch (err) {
            console.error("Failed to load records:", err);
            setError("Unable to load suspicious vehicle records from database.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedRiskLevel, pageSize]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchRecords();
        }, 250);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedRiskLevel, currentPage, pageSize]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            await syncVehicleRecords(50);
            await fetchRecords();
        } catch (err) {
            console.error("Batch sync failed:", err);
        } finally {
            setSyncing(false);
        }
    };

    const handleInspect = (vehicleNumber) => {
        navigate(`/?vehicle=${vehicleNumber}`);
    };

    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const startRecordIndex = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRecordIndex = Math.min(currentPage * pageSize, totalRecords);

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
                            Suspicious Registry
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
                    
                    {/* Page Title & Action */}
                    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border ${cardClass}`}>
                        <div className="flex items-center gap-3">
                            <div>
                                    <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                    Suspicious Vehicle Risk Registry
                                </h1>
                                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Continuous SQL persistence of evaluated E-Way Bill & FASTag fraud records
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50 shrink-0 self-start md:self-auto"
                        >
                            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                            <span>{syncing ? "Evaluating..." : "Scan & Sync Database"}</span>
                        </button>
                    </div>

                    {/* Stats Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className={`rounded-xl border p-4 flex items-center gap-3.5 ${subCardClass}`}>
                            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20">
                                <FileText size={18} />
                            </div>
                            <div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Evaluated</p>
                                <h3 className={`text-lg font-black font-mono ${isDark ? "text-white" : "text-slate-900"}`}>{stats.total_records.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className={`rounded-xl border p-4 flex items-center gap-3.5 ${subCardClass}`}>
                            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg border border-rose-500/20">
                                <ShieldAlert size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">High Risk</p>
                                <h3 className="text-lg font-black font-mono text-rose-500">{stats.high_risk.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className={`rounded-xl border p-4 flex items-center gap-3.5 ${subCardClass}`}>
                            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Medium Risk</p>
                                <h3 className="text-lg font-black font-mono text-amber-500">{stats.medium_risk.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className={`rounded-xl border p-4 flex items-center gap-3.5 ${subCardClass}`}>
                            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                                <Activity size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Avg Risk Score</p>
                                <h3 className="text-lg font-black font-mono text-emerald-500">{stats.average_risk_score} / 130</h3>
                            </div>
                        </div>
                    </div>

                    {/* Controls & Filter Bar */}
                    <div className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl border ${cardClass}`}>
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500" : "text-slate-400"}`} size={16} />
                            <input
                                type="text"
                                placeholder="Filter vehicle registration number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-all font-mono uppercase ${
                                    isDark
                                        ? "bg-slate-900/80 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                                        : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm"
                                }`}
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div className={`flex items-center gap-1 p-1 rounded-xl border self-start md:self-auto overflow-x-auto ${
                            isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
                        }`}>
                            <button
                                onClick={() => setSelectedRiskLevel("")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                    selectedRiskLevel === ""
                                        ? isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                                        : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                All ({totalRecords.toLocaleString()})
                            </button>
                            <button
                                onClick={() => setSelectedRiskLevel("HIGH")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                    selectedRiskLevel === "HIGH"
                                        ? "bg-rose-500 text-white shadow-sm"
                                        : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                }`}
                            >
                                High Risk
                            </button>
                            <button
                                onClick={() => setSelectedRiskLevel("MEDIUM")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                    selectedRiskLevel === "MEDIUM"
                                        ? "bg-amber-500 text-white shadow-sm"
                                        : "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                }`}
                            >
                                Medium Risk
                            </button>
                            <button
                                onClick={() => setSelectedRiskLevel("LOW")}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                    selectedRiskLevel === "LOW"
                                        ? "bg-emerald-500 text-white shadow-sm"
                                        : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                }`}
                            >
                                Low Risk
                            </button>
                        </div>
                    </div>

                    {/* Directory Cards Grid */}
                    {loading && (
                        <Loading variant="cards" />
                    )}

                    {!loading && records.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {records.map((item) => {
                                const isHigh = item.risk_level === "HIGH";
                                const isMed = item.risk_level === "MEDIUM";

                                return (
                                    <div
                                        key={item.id}
                                        className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${cardClass}`}
                                    >
                                        <div className="space-y-3">
                                            {/* Top Header Row */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className={`px-3 py-1 rounded-xl font-mono font-bold text-sm tracking-wider border ${
                                                    isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                                                }`}>
                                                    {item.vehicle_number}
                                                </div>

                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                    isHigh
                                                        ? isDark ? "bg-rose-950/60 text-rose-300 border-rose-800/60" : "bg-rose-100 text-rose-800 border-rose-200"
                                                        : isMed
                                                        ? isDark ? "bg-amber-950/60 text-amber-300 border-amber-800/60" : "bg-amber-100 text-amber-800 border-amber-200"
                                                        : isDark ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                }`}>
                                                    {item.risk_level} RISK
                                                </span>
                                            </div>

                                            {/* Risk Score Progress */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs font-mono">
                                                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Risk Score</span>
                                                    <span className={`font-bold ${isHigh ? "text-rose-500" : isMed ? "text-amber-500" : "text-emerald-500"}`}>
                                                        {item.risk_score} / 130
                                                    </span>
                                                </div>
                                                <div className={`w-full rounded-full h-1.5 overflow-hidden ${
                                                    isDark ? "bg-slate-800" : "bg-slate-200"
                                                }`}>
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            isHigh ? "bg-rose-500" : isMed ? "bg-amber-500" : "bg-emerald-500"
                                                        }`}
                                                        style={{ width: `${Math.min(100, (item.risk_score / 130) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Summary */}
                                            <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                                {item.summary_reasons || "Standard operational baseline"}
                                            </p>
                                        </div>

                                        {/* Action */}
                                        <button
                                            onClick={() => handleInspect(item.vehicle_number)}
                                            className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 transform hover:-translate-y-0.5 border flex items-center justify-center gap-1.5 ${
                                                isDark
                                                    ? "bg-slate-900/90 text-slate-200 border-slate-800 hover:bg-black hover:text-white hover:border-slate-700 hover:shadow-lg hover:shadow-black/50 active:translate-y-0"
                                                    : "bg-slate-900 text-white border-transparent hover:bg-black hover:shadow-md hover:shadow-slate-900/20 active:translate-y-0"
                                            }`}
                                        >
                                            <span>Inspect Dossier</span>
                                            <ArrowUpRight size={13} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs ${cardClass}`}>
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-40 ${
                                        isDark ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                                    }`}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-40 ${
                                        isDark ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                                    }`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </main>

                <Footer />
            </div>

            {/* AI Risk Copilot Slide-Over Drawer */}
            <CopilotDrawer
                isOpen={copilotOpen}
                onOpen={() => setCopilotOpen(true)}
                onClose={() => setCopilotOpen(false)}
            />
        </div>
    );
}
