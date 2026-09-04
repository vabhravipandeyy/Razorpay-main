import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import CopilotDrawer from "../components/CopilotDrawer";

import {
    getCaseDetail,
    updateCaseStatus,
    addCaseNote,
    reviewCaseEvidence,
    resolveCase,
    closeCase
} from "../api/investigations";

import {
    Briefcase,
    ArrowLeft,
    Truck,
    ShieldAlert,
    Clock,
    User,
    CheckCircle2,
    AlertCircle,
    FileText,
    MessageSquare,
    ExternalLink,
    Send,
    Menu,
    Sun,
    Moon
} from "lucide-react";

export default function InvestigationDetail() {
    const { caseId } = useParams();
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Add Note State
    const [newNote, setNewNote] = useState("");
    const [noteLoading, setNoteLoading] = useState(false);

    // Evidence Review State
    const [editingEvidence, setEditingEvidence] = useState(null);
    const [evidenceStatus, setEvidenceStatus] = useState("REVIEWED");
    const [evidenceNotes, setEvidenceNotes] = useState("");
    const [reviewLoading, setReviewLoading] = useState(false);

    // Resolve Case Modal State
    const [isResolveOpen, setIsResolveOpen] = useState(false);
    const [resolutionType, setResolutionType] = useState("COMPLIANCE_ISSUE");
    const [resolutionSummary, setResolutionSummary] = useState("");
    const [resolutionNotes, setResolutionNotes] = useState("");
    const [resolveLoading, setResolveLoading] = useState(false);

    // Copilot Drawer State
    const [isCopilotOpen, setIsCopilotOpen] = useState(false);

    const fetchCase = async () => {
        try {
            setLoading(true);
            const data = await getCaseDetail(caseId);
            setCaseData(data);
        } catch (err) {
            console.error("Failed to load case detail:", err);
            setErrorMsg("Investigation case not found or access denied.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCase();
    }, [caseId]);

    const handleAdvanceStatus = async (targetStatus) => {
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await updateCaseStatus(caseId, targetStatus);
            setSuccessMsg(res.message);
            fetchCase();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Status transition failed.");
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim() || noteLoading) return;

        try {
            setNoteLoading(true);
            setErrorMsg("");
            await addCaseNote(caseId, newNote.trim());
            setNewNote("");
            fetchCase();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to add investigation note.");
        } finally {
            setNoteLoading(false);
        }
    };

    const handleSaveEvidenceReview = async (e) => {
        e.preventDefault();
        if (!editingEvidence) return;

        try {
            setReviewLoading(true);
            setErrorMsg("");
            await reviewCaseEvidence(
                caseId,
                editingEvidence.evidence_id,
                evidenceStatus,
                evidenceNotes || null
            );
            setEditingEvidence(null);
            fetchCase();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to save evidence review.");
        } finally {
            setReviewLoading(false);
        }
    };

    const handleResolveCase = async (e) => {
        e.preventDefault();
        if (!resolutionSummary.trim()) return;

        try {
            setResolveLoading(true);
            setErrorMsg("");
            await resolveCase(caseId, {
                resolution_type: resolutionType,
                summary: resolutionSummary.trim(),
                notes: resolutionNotes.trim() || null,
            });
            setIsResolveOpen(false);
            setSuccessMsg("Investigation formally resolved.");
            fetchCase();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to resolve case.");
        } finally {
            setResolveLoading(false);
        }
    };

    const handleCloseCase = async () => {
        try {
            setErrorMsg("");
            await closeCase(caseId);
            setSuccessMsg("Case has been formally closed and archived.");
            fetchCase();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to close case.");
        }
    };

    const cardClass = isDark
        ? "bg-[#0d121f] border-slate-800/90 text-slate-100 shadow-xl"
        : "bg-white border-slate-200 text-slate-900 shadow-sm";

    const subCardClass = isDark
        ? "bg-[#111827]/70 border-slate-800"
        : "bg-slate-50/80 border-slate-200";

    if (loading) {
        return (
            <div className={`min-h-screen ${isDark ? "bg-[#0b0f19]" : "bg-[#f8fafc]"} flex flex-col md:flex-row font-sans`}>
                <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
                <div className="flex-1 flex flex-col min-w-0 p-6 md:p-10">
                    <Loading variant="detail" />
                </div>
            </div>
        );
    }

    if (!caseData || errorMsg) {
        return (
            <div className={`min-h-screen ${isDark ? "bg-[#0b0f19] text-slate-100" : "bg-[#f8fafc] text-slate-900"} flex flex-col font-sans`}>
                <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
                <main className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4 flex-1">
                    <AlertCircle size={40} className="text-rose-500 mx-auto" />
                    <h2 className="text-xl font-bold">Investigation Case Error</h2>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{errorMsg || "Unable to locate case record."}</p>
                    <Link to="/investigations" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-xs font-semibold text-white">
                        <ArrowLeft size={14} /> Back to Case Register
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    const current = caseData.current_risk || {};
    const evidenceItems = caseData.evidence_items || [];
    const evidenceReviews = caseData.evidence_reviews || {};
    const notes = caseData.notes || [];

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
                            Case Docket
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
                    
                    {/* Back Link */}
                    <div className="flex items-center justify-between">
                        <Link
                            to="/investigations"
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                            } transition-colors`}
                        >
                            <ArrowLeft size={14} /> Back to Case Register
                        </Link>
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

                    {/* 1. CASE HEADER CARD */}
                    <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${cardClass}`}>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        Docket
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                                        isDark ? "bg-blue-950 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-800"
                                    }`}>
                                        {caseData.case_number}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                                        isDark ? "bg-purple-950 border-purple-800 text-purple-300" : "bg-purple-50 border-purple-200 text-purple-800"
                                    }`}>
                                        {caseData.status}
                                    </span>
                                </div>

                                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                    {caseData.title || `Investigation: ${caseData.vehicle_number}`}
                                </h1>

                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <span className={`flex items-center gap-1.5 font-mono font-bold px-2.5 py-1 rounded-lg border ${
                                        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                                    }`}>
                                        <Truck size={13} className="text-blue-500" />
                                        {caseData.vehicle_number}
                                    </span>

                                    <span className={`flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        <User size={13} />
                                        Assigned: <strong className={isDark ? "text-white" : "text-slate-900"}>{caseData.assignee_name || "Inspector"}</strong>
                                    </span>

                                    <span className={`flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        <Clock size={13} />
                                        Initiated: <strong className={isDark ? "text-white" : "text-slate-900"}>{new Date(caseData.created_at).toLocaleDateString()}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Status Advancement Actions */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {caseData.status === "NEW" && (
                                    <button
                                        onClick={() => handleAdvanceStatus("UNDER_REVIEW")}
                                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                                    >
                                        Commence Review →
                                    </button>
                                )}

                                {caseData.status === "UNDER_REVIEW" && (
                                    <button
                                        onClick={() => handleAdvanceStatus("INVESTIGATION")}
                                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                                    >
                                        Escalate to Investigation →
                                    </button>
                                )}

                                {(caseData.status === "UNDER_REVIEW" || caseData.status === "INVESTIGATION") && (
                                    <button
                                        onClick={() => setIsResolveOpen(true)}
                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                                    >
                                        Submit Resolution
                                    </button>
                                )}

                                {caseData.status === "RESOLVED" && (
                                    <button
                                        onClick={handleCloseCase}
                                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                                    >
                                        Close Docket
                                    </button>
                                )}

                                <Link
                                    to={`/?vehicle=${caseData.vehicle_number}`}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                                        isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
                                    }`}
                                >
                                    <span>Live Telemetry</span>
                                    <ExternalLink size={13} />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* 2. SNAPSHOT VS CURRENT RISK */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`rounded-2xl border p-5 space-y-2.5 ${cardClass}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider block font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Snapshot at Creation
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                                <div className={`p-3 rounded-xl border ${subCardClass}`}>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Risk Score</span>
                                    <p className="text-lg font-black font-mono text-rose-500 mt-0.5">{caseData.risk_score} / 100</p>
                                </div>
                                <div className={`p-3 rounded-xl border ${subCardClass}`}>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Priority</span>
                                    <p className="text-xs font-bold font-mono text-rose-500 mt-1.5">{caseData.investigation_priority}</p>
                                </div>
                                <div className={`p-3 rounded-xl border ${subCardClass}`}>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Risk Level</span>
                                    <p className="text-xs font-bold font-mono mt-1.5">{caseData.risk_level}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-2xl border p-5 space-y-2.5 ${cardClass}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider block font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Live Telemetry Index
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                                <div className={`p-3 rounded-xl border ${subCardClass}`}>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Live Risk</span>
                                    <p className="text-lg font-black font-mono text-emerald-500 mt-0.5">{current.fraud_risk_score ?? "—"} / 100</p>
                                </div>
                                <div className={`p-3 rounded-xl border ${subCardClass}`}>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">ML Outlier</span>
                                    <p className="text-xs font-bold font-mono text-purple-500 mt-1.5">{current.ml_anomaly_score ?? "—"} / 100</p>
                                </div>
                                <div className={`p-3 rounded-xl border ${subCardClass}`}>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Live Priority</span>
                                    <p className="text-xs font-bold font-mono text-cyan-600 mt-1.5">{current.priority || "NORMAL"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. CASE EVIDENCE REVIEW DOSSIER */}
                    <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${cardClass}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={18} className="text-rose-500" />
                                <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                    Case Evidence Dossier
                                </h2>
                            </div>
                            <span className={`text-xs font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                {evidenceItems.length} Finding(s)
                            </span>
                        </div>

                        <div className="space-y-3">
                            {evidenceItems.map((ev, idx) => {
                                const rev = evidenceReviews[ev.evidence_id];
                                return (
                                    <div key={idx} className={`p-4 rounded-xl border space-y-2 ${subCardClass}`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold text-slate-400">{ev.evidence_id}</span>
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300">
                                                        {ev.severity || "HIGH"} SEVERITY
                                                    </span>
                                                </div>
                                                <h4 className={`text-xs font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>{ev.title}</h4>
                                                <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>{ev.description}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingEvidence(ev);
                                                    setEvidenceStatus(rev?.status || "REVIEWED");
                                                    setEvidenceNotes(rev?.notes || "");
                                                }}
                                                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold self-start sm:self-auto shrink-0"
                                            >
                                                {rev ? "Edit Assessment" : "Record Assessment"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 4. INVESTIGATION NOTES */}
                    <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${cardClass}`}>
                        <div className="flex items-center gap-2">
                            <MessageSquare size={18} className="text-blue-500" />
                            <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                Investigator Notes
                            </h2>
                        </div>

                        {/* Note Form */}
                        <form onSubmit={handleAddNote} className="space-y-2">
                            <textarea
                                rows={3}
                                placeholder="Add official case note..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                className={`w-full border rounded-xl p-3 text-xs outline-none ${
                                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                                }`}
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={noteLoading || !newNote.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Send size={13} />
                                    <span>{noteLoading ? "Posting..." : "Post Case Note"}</span>
                                </button>
                            </div>
                        </form>

                        {/* Note Thread */}
                        <div className="space-y-2 pt-2">
                            {notes.map((n) => (
                                <div key={n.id} className={`p-3 rounded-xl border text-xs space-y-1 ${subCardClass}`}>
                                    <div className="flex justify-between font-mono text-[11px] text-slate-400">
                                        <span className="font-bold text-blue-600">{n.author_name}</span>
                                        <span>{new Date(n.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className={isDark ? "text-slate-200" : "text-slate-800"}>{n.note_text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                <Footer />
            </div>

            {/* Evidence Modal */}
            {editingEvidence && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl border ${
                        isDark ? "bg-[#0e1320] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}>
                        <h3 className="text-base font-bold">Assess Evidence: {editingEvidence.title}</h3>
                        <form onSubmit={handleSaveEvidenceReview} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1">Status</label>
                                <select
                                    value={evidenceStatus}
                                    onChange={(e) => setEvidenceStatus(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none"
                                >
                                    <option value="REVIEWED">REVIEWED</option>
                                    <option value="ACCEPTED">ACCEPTED (VERIFIED)</option>
                                    <option value="DISMISSED">DISMISSED (FALSE POSITIVE)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-1">Inspector Memo</label>
                                <textarea
                                    rows={3}
                                    value={evidenceNotes}
                                    onChange={(e) => setEvidenceNotes(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingEvidence(null)}
                                    className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={reviewLoading}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                                >
                                    Save Assessment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Resolve Modal */}
            {isResolveOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl border ${
                        isDark ? "bg-[#0e1320] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}>
                        <h3 className="text-base font-bold">Formal Case Resolution</h3>
                        <form onSubmit={handleResolveCase} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1">Resolution Classification</label>
                                <select
                                    value={resolutionType}
                                    onChange={(e) => setResolutionType(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none"
                                >
                                    <option value="COMPLIANCE_ISSUE">COMPLIANCE_ISSUE (PENALTY LEVIED)</option>
                                    <option value="FRAUD_CONFIRMED">FRAUD_CONFIRMED (SECTION 130 SEIZURE)</option>
                                    <option value="FALSE_POSITIVE">FALSE_POSITIVE (EXONERATED)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-1">Resolution Summary *</label>
                                <input
                                    type="text"
                                    required
                                    value={resolutionSummary}
                                    onChange={(e) => setResolutionSummary(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-transparent outline-none"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsResolveOpen(false)}
                                    className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={resolveLoading}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                                >
                                    Confirm Resolution
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Risk Copilot Slide-Over Drawer */}
            <CopilotDrawer
                isOpen={isCopilotOpen}
                onOpen={() => setIsCopilotOpen(true)}
                onClose={() => setIsCopilotOpen(false)}
                activeVehicleNumber={caseData.vehicle_number}
            />
        </div>
    );
}
