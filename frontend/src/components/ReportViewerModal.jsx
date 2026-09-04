import { ShieldAlert, Printer, Download, X, FileText, CheckCircle2, Clock } from "lucide-react";

export default function ReportViewerModal({ isOpen, onClose, reportData }) {
    if (!isOpen || !reportData) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Modal Action Header (Excluded from Print) */}
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-blue-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                            Formal Intelligence Report Dossier
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
                        >
                            <Printer size={14} />
                            <span>Print / PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Report Content */}
                <div className="p-8 sm:p-12 overflow-y-auto space-y-8 text-slate-100 bg-slate-900 font-sans print:bg-white print:text-black print:p-0">
                    {/* Header */}
                    <div className="border-b border-slate-800 print:border-black/20 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={24} className="text-blue-500 print:text-black" />
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-black">
                                    {reportData.title || "GST Risk Management Report"}
                                </h1>
                            </div>
                            <p className="text-xs text-slate-400 print:text-gray-600 font-medium">
                                Directorate General of Goods and Services Tax Intelligence (DGGI) Analytics
                            </p>
                        </div>

                        <div className="text-left sm:text-right text-[11px] font-mono text-slate-400 print:text-gray-600 space-y-0.5">
                            <div>Generated: <strong>{new Date(reportData.generated_at).toLocaleString()}</strong></div>
                            <div>Officer: <strong>{reportData.generated_by || "System Administrator"}</strong></div>
                            <div>Dossier Type: <strong>{reportData.report_type}</strong></div>
                        </div>
                    </div>

                    {/* Executive KPIs */}
                    {reportData.overview_kpis && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-gray-700 font-mono">
                                1. Executive Telemetry Overview
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 bg-slate-950/80 print:bg-gray-100 rounded-2xl border border-slate-800 print:border-gray-300">
                                    <span className="text-[10px] text-slate-400 print:text-gray-600 font-bold uppercase">Evaluated Vehicles</span>
                                    <p className="text-xl font-black font-mono text-white print:text-black mt-1">
                                        {reportData.overview_kpis.total_vehicles}
                                    </p>
                                </div>
                                <div className="p-3.5 bg-slate-950/80 print:bg-gray-100 rounded-2xl border border-slate-800 print:border-gray-300">
                                    <span className="text-[10px] text-slate-400 print:text-gray-600 font-bold uppercase">High Risk Fleet</span>
                                    <p className="text-xl font-black font-mono text-red-400 print:text-red-700 mt-1">
                                        {reportData.overview_kpis.high_risk_vehicles}
                                    </p>
                                </div>
                                <div className="p-3.5 bg-slate-950/80 print:bg-gray-100 rounded-2xl border border-slate-800 print:border-gray-300">
                                    <span className="text-[10px] text-slate-400 print:text-gray-600 font-bold uppercase">Average Risk Index</span>
                                    <p className="text-xl font-black font-mono text-white print:text-black mt-1">
                                        {reportData.overview_kpis.average_risk_score} / 100
                                    </p>
                                </div>
                                <div className="p-3.5 bg-slate-950/80 print:bg-gray-100 rounded-2xl border border-slate-800 print:border-gray-300">
                                    <span className="text-[10px] text-slate-400 print:text-gray-600 font-bold uppercase">Active Investigations</span>
                                    <p className="text-xl font-black font-mono text-blue-400 print:text-blue-700 mt-1">
                                        {reportData.overview_kpis.investigations?.open_cases || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Top Risk Signals */}
                    {reportData.top_risk_signals?.signals && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-gray-700 font-mono">
                                2. Statutory Fraud Rule Frequency
                            </h3>
                            <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-gray-300">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-gray-600 uppercase text-[10px] tracking-wider font-mono">
                                        <tr>
                                            <th className="p-3">Rule Identifier</th>
                                            <th className="p-3">Statutory Description</th>
                                            <th className="p-3">Trigger Count</th>
                                            <th className="p-3 text-right">Prevalence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 print:divide-gray-200 bg-slate-900/40 print:bg-white text-slate-200 print:text-black">
                                        {reportData.top_risk_signals.signals.map((sig, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3 font-mono font-bold text-blue-400 print:text-blue-700">{sig.id}</td>
                                                <td className="p-3 font-semibold">{sig.name}</td>
                                                <td className="p-3 font-mono">{sig.count}</td>
                                                <td className="p-3 font-mono font-bold text-right">{sig.percentage}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Top Suspicious Corridors */}
                    {reportData.top_suspicious_corridors && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-gray-700 font-mono">
                                3. Top High-Risk Transit Corridors
                            </h3>
                            <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-gray-300">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-gray-600 uppercase text-[10px] tracking-wider font-mono">
                                        <tr>
                                            <th className="p-3">Origin → Destination Route</th>
                                            <th className="p-3">Vehicles</th>
                                            <th className="p-3">High Risk Count</th>
                                            <th className="p-3 text-right">Average Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 print:divide-gray-200 bg-slate-900/40 print:bg-white text-slate-200 print:text-black">
                                        {reportData.top_suspicious_corridors.map((c, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3 font-mono font-bold">{c.route}</td>
                                                <td className="p-3 font-mono">{c.total_vehicles}</td>
                                                <td className="p-3 font-mono text-red-400 print:text-red-700 font-bold">{c.high_risk_count}</td>
                                                <td className="p-3 font-mono font-bold text-right">{c.average_risk}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Official Disclaimer */}
                    <div className="p-4 bg-slate-950/80 print:bg-gray-100 rounded-2xl border border-slate-800 print:border-gray-300 text-[11px] text-slate-400 print:text-gray-700 leading-relaxed font-sans">
                        <strong className="text-white print:text-black block mb-1">OFFICIAL NOTICE & DISCLAIMER:</strong>
                        {reportData.disclaimer}
                    </div>
                </div>
            </div>
        </div>
    );
}
