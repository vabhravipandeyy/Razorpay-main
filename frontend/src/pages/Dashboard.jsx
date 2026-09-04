import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import Sidebar from "../components/Sidebar";
import UnifiedVehicleHero from "../components/UnifiedVehicleHero";
import RiskHeatmapVisualizer from "../components/RiskHeatmapVisualizer";
import RiskIntelligenceCards from "../components/RiskIntelligenceCards";
import MLRiskIntelligence from "../components/MLRiskIntelligence";
import RiskDrivers from "../components/RiskDrivers";
import InvestigationGuidance from "../components/InvestigationGuidance";
import RiskSignals from "../components/RiskSignals";
import RuleTable from "../components/RuleTable";
import TripTable from "../components/TripTable";
import VehicleMap from "../components/VehicleMap";
import Timeline from "../components/Timeline";
import EvidenceModal from "../components/EvidenceModal";
import CopilotDrawer from "../components/CopilotDrawer";
import Loading from "../components/Loading";
import Footer from "../components/Footer";

import { analyzeVehicle, getSuspiciousRecords } from "../api/analysis";
import {
    Search,
    AlertCircle,
    RefreshCw,
    Bot,
    Truck,
    Activity,
    ChevronRight,
    ArrowUpRight,
    Info,
    X,
    Menu,
    ShieldAlert,
    Layers,
    Cpu,
    FileText,
    MapPin,
    SlidersHorizontal,
    Flame,
    Sun,
    Moon
} from "lucide-react";

export default function Dashboard() {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const vehicleQuery = searchParams.get("vehicle") || "";

    const [mobileOpen, setMobileOpen] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    const [isCopilotOpen, setIsCopilotOpen] = useState(false);

    // Active Section Tab
    // Tabs: "overview" | "ml_risk" | "evidence" | "rules" | "telemetry" | "all"
    const [activeSectionTab, setActiveSectionTab] = useState("overview");

    // Fleet list state for vehicle cards
    const [fleetVehicles, setFleetVehicles] = useState([]);
    const [fleetLoading, setFleetLoading] = useState(true);
    const [searchFilter, setSearchFilter] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [viewingVehicleInfo, setViewingVehicleInfo] = useState(null);

    const officerName = user?.username || "admin";

    // 3 Category Realm Spaces
    const realmSpaces = [
        {
            id: "high_risk",
            title: "Critical Threat Fleet",
            tagline: "Impossible speed anomalies & route direction mismatches.",
            filter: "HIGH",
            badge: "HIGH RISK",
            color: isDark ? "text-rose-400" : "text-rose-600",
            hoverBorder: isDark ? "hover:border-rose-500/40" : "hover:border-rose-400",
            bg: isDark
                ? "bg-slate-900/60 border-slate-800"
                : "bg-white border-slate-200 shadow-sm",
        },
        {
            id: "toll_corridors",
            title: "Toll Sensor Outliers",
            tagline: "Unregistered transit passages & suspicious time intervals.",
            filter: "MEDIUM",
            badge: "MEDIUM RISK",
            color: isDark ? "text-cyan-400" : "text-cyan-600",
            hoverBorder: isDark ? "hover:border-cyan-500/40" : "hover:border-cyan-400",
            bg: isDark
                ? "bg-slate-900/60 border-slate-800"
                : "bg-white border-slate-200 shadow-sm",
        },
        {
            id: "ewb_discrepancies",
            title: "Manifest Discrepancies",
            tagline: "Duplicate overlapping E-Way Bills & expired validity.",
            filter: "ALL",
            badge: "ALL MONITORED",
            color: isDark ? "text-emerald-400" : "text-emerald-600",
            hoverBorder: isDark ? "hover:border-emerald-500/40" : "hover:border-emerald-400",
            bg: isDark
                ? "bg-slate-900/60 border-slate-800"
                : "bg-white border-slate-200 shadow-sm",
        },
    ];

    // Load fleet records
    useEffect(() => {
        const loadFleet = async () => {
            try {
                setFleetLoading(true);
                const res = await getSuspiciousRecords({ limit: 40 });
                if (res?.records) {
                    setFleetVehicles(res.records);
                }
            } catch (err) {
                console.error("Failed to fetch fleet records:", err);
            } finally {
                setFleetLoading(false);
            }
        };
        loadFleet();
    }, []);

    const fetchAnalysis = async (vehicleNumber) => {
        if (!vehicleNumber) return;

        try {
            setLoading(true);
            setError("");
            setAnalysis(null);

            const response = await analyzeVehicle(vehicleNumber);
            setAnalysis(response);
        } catch (err) {
            console.error("Analysis fetch error:", err);
            if (err.response?.status === 404) {
                setError(`Vehicle "${vehicleNumber}" not found in dataset.`);
            } else if (err.response?.status === 401) {
                setError("Your session has expired. Please sign in again.");
            } else {
                setError(`Unable to complete risk analysis for "${vehicleNumber}".`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVehicle = (vehicleNumber) => {
        if (!vehicleNumber) return;
        setSearchParams({ vehicle: vehicleNumber });
        setActiveSectionTab("overview");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleClearSelection = () => {
        setSearchParams({});
        setAnalysis(null);
    };

    useEffect(() => {
        if (vehicleQuery) {
            fetchAnalysis(vehicleQuery);
        } else {
            setAnalysis(null);
        }
    }, [vehicleQuery]);

    // Filtered vehicles for the card grid
    const filteredVehicles = useMemo(() => {
        return fleetVehicles.filter((v) => {
            const matchesSearch =
                !searchFilter ||
                v.vehicle_number?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                v.risk_level?.toLowerCase().includes(searchFilter.toLowerCase());

            const matchesCategory =
                !selectedCategory ||
                selectedCategory === "ALL" ||
                v.risk_level === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [fleetVehicles, searchFilter, selectedCategory]);

    // Segmented Navigation Tabs Configuration
    const sectionTabs = [
        { id: "overview", label: "Overview & Heatmap", icon: Flame },
        { id: "ml_risk", label: "ML Diagnostics", icon: Cpu },
        { id: "evidence", label: "Evidence & Signals", icon: ShieldAlert },
        { id: "rules", label: "Statutory Rules", icon: FileText },
        { id: "telemetry", label: "Transit & Map", icon: MapPin },
        { id: "all", label: "Full Dossier", icon: SlidersHorizontal }
    ];

    return (
        <div className={`min-h-screen ${
            isDark ? "bg-[#0b0f19] text-slate-100" : "bg-[#f8fafc] text-slate-900"
        } flex flex-col md:flex-row font-sans antialiased relative transition-colors duration-200`}>
            
            {/* 1. LEFT SIDEBAR */}
            <Sidebar
                onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)}
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
                            GST Risk Manager
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
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${
                            isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                        }`}>
                            {officerName}
                        </span>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full space-y-6 flex-1">
                    
                    {/* OFFICER GREETING & SURVEILLANCE STATUS */}
                    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-3 pb-5 border-b ${
                        isDark ? "border-slate-800/80" : "border-slate-200"
                    }`}>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                                    isDark ? "text-white" : "text-slate-900"
                                }`}>
                                    Hello, {officerName}
                                </h1>
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            </div>
                            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                GST Risk Intelligence Surveillance Console • Active Telemetry Feeds
                            </p>
                        </div>

                        {/* Status Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-mono ${
                                isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-sm"
                            }`}>
                                <Activity size={12} className="text-emerald-500" />
                                <span>70/30 Hybrid Risk Engine</span>
                            </div>
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-mono ${
                                isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-sm"
                            }`}>
                                <Truck size={12} className="text-cyan-500" />
                                <span>12,000+ Monitored EWBs</span>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* ACTIVE VEHICLE INVESTIGATION VIEW */}
                    {/* ========================================================= */}
                    {vehicleQuery && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            
                            {/* Unified High-Precision Vehicle Hero */}
                            <UnifiedVehicleHero
                                data={analysis}
                                onClose={handleClearSelection}
                            />

                            {/* Clean Segmented Navigation Tabs */}
                            <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                                isDark ? "bg-[#090d16] border-slate-800/80" : "bg-slate-100 border-slate-200"
                            } overflow-x-auto no-scrollbar`}>
                                {sectionTabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeSectionTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveSectionTab(tab.id)}
                                            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all shrink-0 ${
                                                isActive
                                                    ? isDark
                                                        ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                                                        : "bg-white text-slate-900 shadow-sm border border-slate-200"
                                                    : isDark
                                                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                                            }`}
                                        >
                                            <Icon size={14} className={isActive ? "text-emerald-500" : isDark ? "text-slate-400" : "text-slate-500"} />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Error Banner */}
                            {error && (
                                <div className="rounded-xl bg-red-950/40 border border-red-800/60 p-4 text-red-300 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle size={18} className="text-red-400 shrink-0" />
                                        <span className="text-xs font-medium">{error}</span>
                                    </div>
                                    <button
                                        onClick={() => fetchAnalysis(vehicleQuery)}
                                        className="px-3 py-1 bg-red-900/40 hover:bg-red-800/40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        <RefreshCw size={13} /> Retry
                                    </button>
                                </div>
                            )}

                            {/* Loading State */}
                            {loading && (
                                <Loading variant="detail" />
                            )}

                            {/* Tab Content */}
                            {!loading && analysis && (
                                <div className="space-y-6">
                                    
                                    {/* SECTION 1: OVERVIEW & HEATMAP */}
                                    {(activeSectionTab === "overview" || activeSectionTab === "all") && (
                                        <div className="space-y-6 animate-in fade-in duration-150">
                                            <RiskHeatmapVisualizer data={analysis} />
                                            <RiskIntelligenceCards data={analysis} />
                                        </div>
                                    )}

                                    {/* SECTION 2: ML ANOMALY DETECTION */}
                                    {(activeSectionTab === "ml_risk" || activeSectionTab === "all") && (
                                        <div className="animate-in fade-in duration-150">
                                            <MLRiskIntelligence data={analysis} />
                                        </div>
                                    )}

                                    {/* SECTION 3: EVIDENCE CHAINS & SIGNALS */}
                                    {(activeSectionTab === "evidence" || activeSectionTab === "all") && (
                                        <div className="space-y-6 animate-in fade-in duration-150">
                                            <RiskDrivers data={analysis} onSelectEvidence={(ev) => setSelectedEvidence(ev)} />
                                            <InvestigationGuidance data={analysis} />
                                            <RiskSignals data={analysis} />
                                        </div>
                                    )}

                                    {/* SECTION 4: STATUTORY RULE MATRIX */}
                                    {(activeSectionTab === "rules" || activeSectionTab === "all") && (
                                        <div className="animate-in fade-in duration-150">
                                            <RuleTable data={analysis} />
                                        </div>
                                    )}

                                    {/* SECTION 5: TRANSIT & MAP */}
                                    {(activeSectionTab === "telemetry" || activeSectionTab === "all") && (
                                        <div className="space-y-6 animate-in fade-in duration-150">
                                            <TripTable data={analysis} />
                                            <VehicleMap data={analysis} />
                                            <Timeline data={analysis} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* DEFAULT FLEET REGISTRY (When not auditing a vehicle) */}
                    {/* ========================================================= */}
                    {!vehicleQuery && (
                        <div className="space-y-6">
                            
                            {/* 3 REALM / CATEGORY CARDS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {realmSpaces.map((space) => {
                                    const isSelected = selectedCategory === space.filter;
                                    return (
                                        <div
                                            key={space.id}
                                            onClick={() => setSelectedCategory(isSelected ? null : space.filter)}
                                            className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                                                space.bg
                                            } ${isSelected ? "ring-2 ring-emerald-500 border-emerald-500" : `${space.hoverBorder}`} hover:scale-[1.01]`}
                                        >
                                            <div className="flex items-center justify-between mb-2.5">
                                                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                                    isDark ? "bg-slate-800/80 border-slate-700" : "bg-slate-100 border-slate-200"
                                                } ${space.color}`}>
                                                    {space.badge}
                                                </span>
                                                <ArrowUpRight size={14} className={`${space.color} opacity-60`} />
                                            </div>

                                            <h3 className={`text-base font-bold tracking-tight mb-1 ${
                                                isDark ? "text-white" : "text-slate-900"
                                            }`}>
                                                {space.title}
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${
                                                isDark ? "text-slate-400" : "text-slate-600"
                                            }`}>
                                                {space.tagline}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* FLEET SEARCH & FILTER HEADER */}
                            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t ${
                                isDark ? "border-slate-800/80" : "border-slate-200"
                            }`}>
                                <div className="space-y-0.5">
                                    <h2 className={`text-lg font-bold tracking-tight ${
                                        isDark ? "text-white" : "text-slate-900"
                                    }`}>
                                        Monitored Freight Fleet
                                    </h2>
                                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                        Select any commercial vehicle registration to launch full statutory risk dossier.
                                    </p>
                                </div>

                                {/* Search Input */}
                                <div className="relative w-full sm:w-64">
                                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500" : "text-slate-400"}`} size={14} />
                                    <input
                                        type="text"
                                        placeholder="Seek vehicle (e.g. KA01AB1234)..."
                                        value={searchFilter}
                                        onChange={(e) => setSearchFilter(e.target.value)}
                                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-all font-mono ${
                                            isDark
                                                ? "bg-slate-900/80 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500"
                                                : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 shadow-sm"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* VEHICLE CARDS GRID */}
                            {fleetLoading ? (
                                <Loading variant="cards" />
                            ) : filteredVehicles.length === 0 ? (
                                <div className={`p-8 text-center rounded-2xl border space-y-3 ${
                                    isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                                }`}>
                                    <Truck size={28} className={isDark ? "text-slate-600 mx-auto" : "text-slate-400 mx-auto"} />
                                    <p className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                        No vehicles match current criteria.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSearchFilter("");
                                            setSelectedCategory(null);
                                        }}
                                        className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                                            isDark
                                                ? "bg-slate-800 text-emerald-400 border-slate-700"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        }`}
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                    {filteredVehicles.map((v) => {
                                        const isHigh = v.risk_level === "HIGH";
                                        const isMed = v.risk_level === "MEDIUM";
                                        const badgeClass = isHigh
                                            ? isDark
                                                ? "bg-rose-950/60 text-rose-300 border-rose-800/60"
                                                : "bg-rose-100 text-rose-800 border-rose-200"
                                            : isMed
                                            ? isDark
                                                ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                                                : "bg-amber-100 text-amber-800 border-amber-200"
                                            : isDark
                                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                                            : "bg-emerald-100 text-emerald-800 border-emerald-200";

                                        return (
                                            <div
                                                key={v.id || v.vehicle_number}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group ${
                                                    isDark
                                                        ? "bg-[#0d121f] border-slate-800/80 hover:border-slate-700"
                                                        : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                                                }`}
                                            >
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeClass}`}>
                                                            {v.risk_level || "LOW"} RISK
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingVehicleInfo(v)}
                                                            className={`p-1 transition-colors ${
                                                                isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900"
                                                            }`}
                                                            title="Quick Details"
                                                        >
                                                            <Info size={13} />
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <h3 className={`text-base font-bold font-mono tracking-wider transition-colors ${
                                                            isDark
                                                                ? "text-white group-hover:text-emerald-400"
                                                                : "text-slate-900 group-hover:text-emerald-600"
                                                        }`}>
                                                            {v.vehicle_number}
                                                        </h3>
                                                        <p className={`text-[11px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                            {v.trips_count || 1} Trips • {v.fastag_count || 0} Scans
                                                        </p>
                                                    </div>

                                                    <div className={`p-2 rounded-xl border ${
                                                        isDark ? "bg-[#111827]/70 border-slate-800" : "bg-slate-50 border-slate-200"
                                                    }`}>
                                                        <div className="flex justify-between text-[10px] font-mono mb-1">
                                                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Risk Score</span>
                                                            <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                                                                {v.risk_score || 0}/100
                                                            </span>
                                                        </div>
                                                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                                            isDark ? "bg-slate-800" : "bg-slate-200"
                                                        }`}>
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    isHigh
                                                                        ? "bg-rose-500"
                                                                        : isMed
                                                                        ? "bg-amber-500"
                                                                        : "bg-emerald-500"
                                                                }`}
                                                                style={{ width: `${Math.min(100, v.risk_score || 0)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectVehicle(v.vehicle_number)}
                                                    className={`mt-3 w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 transform hover:-translate-y-0.5 border flex items-center justify-center gap-1.5 ${
                                                        isDark
                                                            ? "bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-black hover:text-white hover:border-slate-600 hover:shadow-lg hover:shadow-black/50 active:translate-y-0"
                                                            : "bg-slate-900 text-white border-transparent hover:bg-black hover:shadow-md hover:shadow-slate-900/20 active:translate-y-0"
                                                    }`}
                                                >
                                                    <span>Audit Dossier</span>
                                                    <ChevronRight size={13} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </main>

                <Footer />
            </div>

            {/* Quick Vehicle Info Modal */}
            {viewingVehicleInfo && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`max-w-md w-full rounded-2xl p-5 space-y-4 shadow-xl border ${
                        isDark ? "bg-[#0e1320] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${
                            isDark ? "border-slate-800" : "border-slate-100"
                        }`}>
                            <div>
                                <span className={`text-[10px] font-mono uppercase block font-semibold ${
                                    isDark ? "text-slate-400" : "text-slate-500"
                                }`}>
                                    Vehicle Quick Info
                                </span>
                                <h3 className="text-lg font-bold font-mono">{viewingVehicleInfo.vehicle_number}</h3>
                            </div>
                            <button
                                onClick={() => setViewingVehicleInfo(null)}
                                className={`p-1 rounded-lg ${isDark ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600"}`}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                                <span className={`font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>Assessed Risk Tier</span>
                                <span className="font-bold font-mono">{viewingVehicleInfo.risk_level || "LOW"}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                                <span className={`font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>Hybrid Risk Score</span>
                                <span className="font-bold text-emerald-500 font-mono">{viewingVehicleInfo.risk_score || 0}/100</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                                <span className={`font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>Declared Trips</span>
                                <span className="font-bold">{viewingVehicleInfo.trips_count || 1}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                                <span className={`font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>FASTag Toll Crossings</span>
                                <span className="font-bold">{viewingVehicleInfo.fastag_count || 0}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                const vNum = viewingVehicleInfo.vehicle_number;
                                setViewingVehicleInfo(null);
                                handleSelectVehicle(vNum);
                            }}
                            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/50 border border-slate-800"
                        >
                            Open Full Audit Dossier
                        </button>
                    </div>
                </div>
            )}

            {/* Evidence Modal */}
            {selectedEvidence && (
                <EvidenceModal
                    evidence={selectedEvidence}
                    onClose={() => setSelectedEvidence(null)}
                />
            )}

            {/* AI Risk Copilot Slide-Over Drawer */}
            <CopilotDrawer
                isOpen={isCopilotOpen}
                onOpen={() => setIsCopilotOpen(true)}
                onClose={() => setIsCopilotOpen(false)}
                activeVehicleNumber={vehicleQuery || analysis?.vehicle_number}
            />
        </div>
    );
}
