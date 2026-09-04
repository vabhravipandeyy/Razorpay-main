import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import ReportViewerModal from "../components/ReportViewerModal";
import CopilotDrawer from "../components/CopilotDrawer";
import FalsePositiveCostMatrix from "../components/FalsePositiveCostMatrix";

import {
    getOverviewKPIs,
    getRiskDistribution,
    getRiskTrends,
    getRiskSignals,
    getSuspiciousRoutes,
    getSuspiciousTolls,
    getRegionalRisk,
    getRepeatRiskVehicles,
    getExecutiveReport,
    downloadVehiclesCSV
} from "../api/analytics";

import {
    Activity,
    ShieldAlert,
    TrendingUp,
    BarChart3,
    Compass,
    MapPin,
    AlertTriangle,
    FileText,
    Download,
    RefreshCw,
    Truck,
    ArrowUpRight,
    CheckCircle2,
    Layers,
    ChevronRight,
    Flame,
    Menu,
    Sun,
    Moon
} from "lucide-react";

export default function CommandCenter() {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [days, setDays] = useState(30);
    const [kpis, setKpis] = useState(null);
    const [distribution, setDistribution] = useState(null);
    const [trends, setTrends] = useState([]);
    const [signals, setSignals] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [tolls, setTolls] = useState([]);
    const [regions, setRegions] = useState([]);
    const [repeatVehicles, setRepeatVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

    // Report Modal State
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [activeReportData, setActiveReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    // Copilot Drawer State
    const [copilotOpen, setCopilotOpen] = useState(false);

    const officerName = user?.username || "admin";

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [kpiRes, distRes, trendRes, sigRes, routeRes, tollRes, regRes, repRes] = await Promise.all([
                getOverviewKPIs(days),
                getRiskDistribution(),
                getRiskTrends(days),
                getRiskSignals(),
                getSuspiciousRoutes(6),
                getSuspiciousTolls(6),
                getRegionalRisk(),
                getRepeatRiskVehicles(10)
            ]);

            setKpis(kpiRes);
            setDistribution(distRes);
            setTrends(trendRes || []);
            setSignals(sigRes);
            setRoutes(routeRes || []);
            setTolls(tollRes || []);
            setRegions(regRes || []);
            setRepeatVehicles(repRes || []);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error("Failed to load command center data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [days]);

    const handleGenerateExecutiveReport = async () => {
        try {
            setReportLoading(true);
            const data = await getExecutiveReport(days);
            setActiveReportData(data);
            setReportModalOpen(true);
        } catch (err) {
            alert("Failed to generate executive report.");
        } finally {
            setReportLoading(false);
        }
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
                            Command Center
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
                    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 ${
                        isDark ? "border-slate-800/80" : "border-slate-200"
                    }`}>
                        <div className="flex items-center gap-3.5">
                            
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                                        isDark ? "text-white" : "text-slate-900"
                                    }`}>
                                        GST Risk Command Center
                                    </h1>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                                        isDark ? "bg-rose-950 border-rose-800 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700"
                                    }`}>
                                        Live Ops
                                    </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                    System-wide fleet intelligence, transit corridors & statutory signal analytics
                                </p>
                            </div>
                        </div>

                        {/* Filter & Export Controls */}
                        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                            <div className={`flex items-center rounded-xl p-1 text-xs font-semibold border ${
                                isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
                            }`}>
                                {[7, 30, 90].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDays(d)}
                                        className={`px-3 py-1 rounded-lg transition-all ${
                                            days === d
                                                ? isDark ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                                                : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        {d} Days
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleGenerateExecutiveReport}
                                disabled={reportLoading}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                            >
                                <FileText size={14} />
                                <span>{reportLoading ? "Generating..." : "Executive Dossier"}</span>
                            </button>

                            <button
                                onClick={downloadVehiclesCSV}
                                title="Export Vehicles CSV"
                                className={`p-2 rounded-xl text-xs border transition-colors ${
                                    isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800" : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm"
                                }`}
                            >
                                <Download size={14} />
                            </button>

                            <button
                                onClick={fetchAllData}
                                title={`Last updated ${lastUpdated}`}
                                className={`p-2 rounded-xl text-xs border transition-colors flex items-center gap-1 font-mono text-[11px] ${
                                    isDark ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800" : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm"
                                }`}
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {loading && !kpis ? (
                        <Loading variant="dashboard" />
                    ) : (
                        <>
                            {/* 1. TOP 8 KPI MATRIX */}
                            {kpis && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                                    <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Fleet</span>
                                        <p className={`text-xl font-black font-mono ${isDark ? "text-white" : "text-slate-900"}`}>{kpis.total_vehicles}</p>
                                    </div>

                                    <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>High Risk</span>
                                        <p className="text-xl font-black font-mono text-rose-500">{kpis.high_risk_vehicles}</p>
                                    </div>

                                    <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Medium Risk</span>
                                        <p className="text-xl font-black font-mono text-amber-500">{kpis.medium_risk_vehicles}</p>
                                    </div>

                                    <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Low Risk</span>
                                        <p className="text-xl font-black font-mono text-emerald-500">{kpis.low_risk_vehicles}</p>
                                    </div>

                                    <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Open Cases</span>
                                        <p className="text-xl font-black font-mono text-blue-500">{kpis.investigations?.open_cases || 0}</p>
                                    </div>

                                    <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Urgent Cases</span>
                                        <p className="text-xl font-black font-mono text-rose-500">{kpis.investigations?.urgent_cases || 0}</p>
                                    </div>

                                    <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Avg Risk</span>
                                        <p className={`text-xl font-black font-mono ${isDark ? "text-white" : "text-slate-900"}`}>{kpis.average_risk_score}</p>
                                    </div>

                                    <div className={`rounded-xl border p-3.5 space-y-0.5 ${subCardClass}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Compliance</span>
                                        <p className="text-xl font-black font-mono text-emerald-500">{kpis.average_compliance_score}</p>
                                    </div>
                                </div>
                            )}

                            {/* TRACK 02: FALSE-POSITIVE COST & ROI MATRIX */}
                            <FalsePositiveCostMatrix />

                            {/* 2. RISK DISTRIBUTION & STATUTORY SIGNALS ROW */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                {/* Risk Distribution Breakdown */}
                                <div className={`lg:col-span-5 rounded-2xl border p-5 space-y-4 ${cardClass}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BarChart3 size={17} className="text-rose-500" />
                                            <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                                Fleet Risk Distribution
                                            </h3>
                                        </div>
                                        <Link to="/suspicious" className="text-xs text-blue-600 hover:text-blue-500 font-semibold flex items-center gap-1">
                                            Registry <ChevronRight size={13} />
                                        </Link>
                                    </div>

                                    {distribution && (
                                        <div className="space-y-4">
                                            {/* Multi-segment visual bar */}
                                            <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-300 dark:border-slate-700">
                                                <div style={{ width: `${distribution.high_percentage}%` }} className="bg-rose-500 h-full" />
                                                <div style={{ width: `${distribution.medium_percentage}%` }} className="bg-amber-500 h-full" />
                                                <div style={{ width: `${distribution.low_percentage}%` }} className="bg-emerald-500 h-full" />
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                <div className={`p-2.5 rounded-xl border ${subCardClass}`}>
                                                    <span className="text-[10px] font-bold text-rose-500 uppercase block">High</span>
                                                    <span className="text-base font-black font-mono">{distribution.high_risk_count}</span>
                                                    <span className={`text-[10px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>{distribution.high_percentage}%</span>
                                                </div>
                                                <div className={`p-2.5 rounded-xl border ${subCardClass}`}>
                                                    <span className="text-[10px] font-bold text-amber-500 uppercase block">Med</span>
                                                    <span className="text-base font-black font-mono">{distribution.medium_risk_count}</span>
                                                    <span className={`text-[10px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>{distribution.medium_percentage}%</span>
                                                </div>
                                                <div className={`p-2.5 rounded-xl border ${subCardClass}`}>
                                                    <span className="text-[10px] font-bold text-emerald-500 uppercase block">Low</span>
                                                    <span className="text-base font-black font-mono">{distribution.low_risk_count}</span>
                                                    <span className={`text-[10px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>{distribution.low_percentage}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Statutory Signals Prevalence */}
                                <div className={`lg:col-span-7 rounded-2xl border p-5 space-y-4 ${cardClass}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert size={16} className="text-blue-400" />
                                            <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                                Prevalent Statutory Violations
                                            </h3>
                                        </div>
                                    </div>

                                    {signals && signals.signals && (
                                        <div className="space-y-2.5">
                                            {signals.signals.slice(0, 4).map((sig, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="font-medium text-slate-300">{sig.name || sig.title || sig.id}</span>
                                                        <span className="font-mono text-slate-500">{sig.count} vehicles ({sig.percentage}%)</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-600 rounded-full"
                                                            style={{ width: `${Math.max(4, Math.min(100, sig.percentage))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. SUSPICIOUS CORRIDORS & TOLLS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* Corridors */}
                                <div className={`rounded-2xl border p-5 space-y-4 ${cardClass}`}>
                                    <div className="flex items-center gap-2">
                                        <Compass size={16} className="text-slate-400" />
                                        <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                            High-Risk Transit Corridors
                                        </h3>
                                    </div>

                                    <div className="space-y-2">
                                        {routes.map((rt, idx) => (
                                            <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between text-xs ${subCardClass}`}>
                                                <div className="flex items-center gap-2 font-mono">
                                                    <MapPin size={12} className="text-slate-400" />
                                                    <span className="text-slate-200">{rt.route || `${rt.from_region || "Origin"} → ${rt.to_region || "Destination"}`}</span>
                                                </div>
                                                <div className="flex items-center gap-3 font-mono">
                                                    <span className="text-slate-400">{rt.total_vehicles || 0} vehicles</span>
                                                    <span className="font-bold text-rose-400">{Math.round(rt.average_risk || 0)} Risk</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Repeat Risk Offenders */}
                                <div className={`rounded-2xl border p-5 space-y-4 ${cardClass}`}>
                                    <div className="flex items-center gap-2">
                                        <Truck size={16} className="text-slate-400" />
                                        <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                            Frequent Threat Offenders
                                        </h3>
                                    </div>

                                    <div className="space-y-2">
                                        {repeatVehicles.slice(0, 5).map((veh, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => navigate(`/?vehicle=${veh.vehicle_number}`)}
                                                className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors hover:border-slate-700 ${subCardClass}`}
                                            >
                                                <div className="font-mono font-bold text-blue-400">{veh.vehicle_number}</div>
                                                <div className="flex items-center gap-3 font-mono">
                                                    <span className="text-slate-400">{veh.repeat_status || "Elevated Threat"}</span>
                                                    <span className="font-bold text-rose-400">{veh.risk_score} Risk</span>
                                                    <ChevronRight size={13} className="text-slate-500" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </main>

                <Footer />
            </div>

            {/* Executive Report Viewer Modal */}
            {reportModalOpen && (
                <ReportViewerModal
                    isOpen={reportModalOpen}
                    onClose={() => setReportModalOpen(false)}
                    reportData={activeReportData}
                />
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
