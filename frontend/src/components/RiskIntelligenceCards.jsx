import { useTheme } from "../context/ThemeContext";
import { ShieldAlert, FileCheck, Award, Eye } from "lucide-react";

export default function RiskIntelligenceCards({ data }) {
    const { isDark } = useTheme();
    if (!data) return null;

    // Metric 1: Fraud Risk (0-130)
    const riskScore = data.fraud_risk?.score ?? data.risk_score ?? 0;
    const maxRisk = 130;
    const riskLevel = data.fraud_risk?.level ?? data.risk_level ?? "LOW";
    const riskPercent = Math.min(100, Math.round((riskScore / maxRisk) * 100));

    // Metric 2: Compliance Index (0-100)
    const complianceScore = data.compliance?.score ?? data.compliance_score ?? 100;
    const complianceLevel = data.compliance?.level ?? data.compliance_level ?? "COMPLIANT";
    const complianceBreakdown = data.compliance?.breakdown || {
        ewb_validity: 100,
        movement_compliance: 100,
        route_compliance: 100,
        fastag_consistency: 100,
    };

    // Metric 3: Vehicle Trust Score (0-100)
    const trustScore = data.trust?.score ?? data.trust_score ?? 100;
    const trustLevel = data.trust?.level ?? data.trust_level ?? "HIGH TRUST";
    const trustBreakdown = data.trust?.breakdown || {
        telemetry_sanity: 100,
        movement_consistency: 100,
        documentation_consistency: 100,
        route_consistency: 100,
    };

    // Metric 4: Evidence Confidence Score (0-100)
    const confidenceScore = data.confidence?.score ?? data.confidence_score ?? 85;
    const confidenceLevel = data.confidence?.level ?? data.confidence_level ?? "HIGH CONFIDENCE";
    const dataQualityScore = data.confidence?.data_quality_score ?? data.features?.data_quality?.data_quality_score ?? 100;

    // Razorpay Color Theme
    let riskStroke = "#00B386"; // Razorpay Teal/Green
    let riskTextColor = isDark ? "text-emerald-400" : "text-emerald-700";
    if (riskLevel === "MEDIUM") {
        riskStroke = "#F59E0B";
        riskTextColor = isDark ? "text-amber-400" : "text-amber-700";
    } else if (riskLevel === "HIGH") {
        riskStroke = "#EF4444";
        riskTextColor = isDark ? "text-rose-400" : "text-rose-700";
    }

    let compTextColor = isDark ? "text-emerald-400" : "text-emerald-700";
    let compBg = isDark ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800";
    if (complianceScore < 50) {
        compTextColor = isDark ? "text-rose-400" : "text-rose-700";
        compBg = isDark ? "bg-rose-950/40 border-rose-800/40 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800";
    } else if (complianceScore < 80) {
        compTextColor = isDark ? "text-amber-400" : "text-amber-700";
        compBg = isDark ? "bg-amber-950/40 border-amber-800/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800";
    }

    let trustTextColor = isDark ? "text-emerald-400" : "text-emerald-700";
    let trustBg = isDark ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800";
    if (trustScore < 50) {
        trustTextColor = isDark ? "text-rose-400" : "text-rose-700";
        trustBg = isDark ? "bg-rose-950/40 border-rose-800/40 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800";
    } else if (trustScore < 80) {
        trustTextColor = isDark ? "text-amber-400" : "text-amber-700";
        trustBg = isDark ? "bg-amber-950/40 border-amber-800/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800";
    }

    let confTextColor = isDark ? "text-cyan-400" : "text-cyan-700";
    let confBg = isDark ? "bg-cyan-950/40 border-cyan-800/40 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-800";
    if (confidenceScore < 50) {
        confTextColor = isDark ? "text-slate-400" : "text-slate-600";
        confBg = isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700";
    } else if (confidenceScore < 80) {
        confTextColor = isDark ? "text-blue-400" : "text-blue-700";
        confBg = isDark ? "bg-blue-950/40 border-blue-800/40 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-800";
    }

    const cardClass = isDark
        ? "bg-[#0d121f] border-slate-800/90 text-slate-100 shadow-xl"
        : "bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-md";

    const meterTrack = isDark ? "#1e293b" : "#e2e8f0";

    return (
        <div className="space-y-4">
            {/* Header Title */}
            <div>
                <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    Risk Intelligence Matrix
                </h2>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Multi-dimensional assessment across statutory fraud, documentation compliance, kinematic trust, and observational confidence
                </p>
            </div>

            {/* 4 Clean Razorpay-Style Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Fraud Risk Meter (0-130) */}
                <div className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${cardClass}`}>
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg border ${
                                    isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-200"
                                }`}>
                                    <ShieldAlert size={15} />
                                </div>
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-800"}`}>
                                    Baseline Fraud Risk
                                </h3>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
                            }`}>
                                Max 130
                            </span>
                        </div>

                        <div className="flex items-center justify-center py-2">
                            <div className="relative w-28 h-28 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="48" fill="none" stroke={meterTrack} strokeWidth="8" />
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="48"
                                        fill="none"
                                        stroke={riskStroke}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={301}
                                        strokeDashoffset={301 - (301 * riskPercent) / 100}
                                        className="transition-all duration-700 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-2xl font-black font-mono tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                        {riskScore}
                                    </span>
                                    <span className={`text-[9px] font-bold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        / 130 pts
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] uppercase font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Threat Level
                            </span>
                            <span className={`text-xs font-black ${riskTextColor}`}>{riskLevel} RISK</span>
                        </div>
                        <p className={`text-[11px] leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Aggregated score based on 6 statutory fraud rules.
                        </p>
                    </div>
                </div>

                {/* 2. Compliance Index (0-100) */}
                <div className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${cardClass}`}>
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg border ${
                                    isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200"
                                }`}>
                                    <FileCheck size={15} />
                                </div>
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-800"}`}>
                                    Compliance Index
                                </h3>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${compBg}`}>
                                {complianceLevel}
                            </span>
                        </div>

                        <div className="py-1">
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className={`text-3xl font-black font-mono ${compTextColor}`}>{complianceScore}</span>
                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>/ 100</span>
                            </div>

                            <div className={`w-full h-2 rounded-full overflow-hidden mb-3 ${isDark ? "bg-slate-800" : "bg-slate-100 border border-slate-200"}`}>
                                <div
                                    className={`h-full transition-all duration-700 rounded-full ${
                                        complianceScore >= 80 ? "bg-emerald-500" : complianceScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${complianceScore}%` }}
                                />
                            </div>

                            {/* Sub-breakdown */}
                            <div className={`space-y-1 text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                <div className="flex justify-between">
                                    <span>EWB Validity & Unique:</span>
                                    <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                        {complianceBreakdown.ewb_validity}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Movement Authorization:</span>
                                    <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                        {complianceBreakdown.movement_compliance}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Route Vector Alignment:</span>
                                    <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                        {complianceBreakdown.route_compliance}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                        <p className={`text-[11px] leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Statutory documentation & validity consistency.
                        </p>
                    </div>
                </div>

                {/* 3. Vehicle Trust Score (0-100) */}
                <div className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${cardClass}`}>
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg border ${
                                    isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-600 border-purple-200"
                                }`}>
                                    <Award size={15} />
                                </div>
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-800"}`}>
                                    Vehicle Trust
                                </h3>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${trustBg}`}>
                                {trustLevel}
                            </span>
                        </div>

                        <div className="py-1">
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className={`text-3xl font-black font-mono ${trustTextColor}`}>{trustScore}</span>
                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>/ 100</span>
                            </div>

                            <div className={`w-full h-2 rounded-full overflow-hidden mb-3 ${isDark ? "bg-slate-800" : "bg-slate-100 border border-slate-200"}`}>
                                <div
                                    className={`h-full transition-all duration-700 rounded-full ${
                                        trustScore >= 80 ? "bg-emerald-500" : trustScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${trustScore}%` }}
                                />
                            </div>

                            {/* Sub-breakdown */}
                            <div className={`space-y-1 text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                <div className="flex justify-between">
                                    <span>Kinematic Velocity:</span>
                                    <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                        {trustBreakdown.telemetry_sanity}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Temporal Continuity:</span>
                                    <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                        {trustBreakdown.movement_consistency}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Billing Authenticity:</span>
                                    <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                        {trustBreakdown.documentation_consistency}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                        <p className={`text-[11px] leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Physical movement feasibility & telemetry sanity.
                        </p>
                    </div>
                </div>

                {/* 4. Evidence Confidence Score (0-100) */}
                <div className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${cardClass}`}>
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg border ${
                                    isDark ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-600 border-teal-200"
                                }`}>
                                    <Eye size={15} />
                                </div>
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-800"}`}>
                                    Evidence Confidence
                                </h3>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${confBg}`}>
                                {confidenceLevel}
                            </span>
                        </div>

                        <div className="py-1">
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className={`text-3xl font-black font-mono ${confTextColor}`}>{confidenceScore}</span>
                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>/ 100</span>
                            </div>

                            <div className={`w-full h-2 rounded-full overflow-hidden mb-3 ${isDark ? "bg-slate-800" : "bg-slate-100 border border-slate-200"}`}>
                                <div
                                    className={`h-full transition-all duration-700 rounded-full ${
                                        confidenceScore >= 80 ? "bg-cyan-500" : confidenceScore >= 50 ? "bg-blue-500" : "bg-slate-500"
                                    }`}
                                    style={{ width: `${confidenceScore}%` }}
                                />
                            </div>

                            {/* Sub-breakdown */}
                            <div className={`space-y-1 text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                <div className="flex justify-between">
                                    <span>Telemetry Quality:</span>
                                    <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                        {dataQualityScore}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>EWB Data Points:</span>
                                    <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                        {data.eway_bill_count || 0} bills
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>FASTag Checkpoints:</span>
                                    <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                        {data.fastag_count || 0} scans
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                        <p className={`text-[11px] leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Observational data coverage & evidence richness.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
