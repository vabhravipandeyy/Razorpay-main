import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { 
    FileText, 
    Printer, 
    Send, 
    X, 
    ShieldAlert, 
    CheckCircle2, 
    Building2, 
    Truck, 
    AlertTriangle, 
    Clock, 
    Radio, 
    Lock 
} from "lucide-react";

export default function AutoResponderModal({ isOpen, onClose, noticeData }) {
    const { isDark } = useTheme();
    const [dispatched, setDispatched] = useState(false);
    const [dispatchLoading, setDispatchLoading] = useState(false);

    if (!isOpen || !noticeData) return null;

    const handleDispatch = () => {
        setDispatchLoading(true);
        setTimeout(() => {
            setDispatchLoading(false);
            setDispatched(true);
        }, 800);
    };

    const handlePrint = () => {
        window.print();
    };

    const formatINR = (val) => {
        if (!val && val !== 0) return "₹0";
        return `₹${Math.round(val).toLocaleString("en-IN")}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl my-8 overflow-hidden transition-all ${
                isDark ? "bg-[#0b0f19] border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}>
                
                {/* 1. Top Action Toolbar (Hidden during Print) */}
                <div className={`print:hidden flex items-center justify-between px-6 py-4 border-b ${
                    isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border bg-blue-950/60 text-blue-300 border-blue-800/60">
                            Track 02 Auto-Responder
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                            Statutory Demand & Interception Order
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                isDark ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm"
                            }`}
                        >
                            <Printer size={13} />
                            <span>Print / PDF</span>
                        </button>

                        {!dispatched ? (
                            <button
                                onClick={handleDispatch}
                                disabled={dispatchLoading}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                            >
                                <Send size={13} />
                                <span>{dispatchLoading ? "Dispatching..." : "Dispatch Summons"}</span>
                            </button>
                        ) : (
                            <span className="px-3 py-1.5 rounded-xl text-xs font-bold font-mono bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 size={13} /> Dispatched to Checkpost
                            </span>
                        )}

                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded-xl border transition-colors ${
                                isDark ? "hover:bg-slate-800 text-slate-400 border-slate-800" : "hover:bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* 2. Formal Notice Document Body (Styled for Screen & Print) */}
                <div className="p-6 sm:p-10 space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible">
                    
                    {/* Official Government Seal / Header */}
                    <div className="text-center space-y-1.5 border-b border-slate-700/40 pb-5">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 font-mono">
                            GOVERNMENT OF INDIA • MINISTRY OF FINANCE • DEPARTMENT OF REVENUE
                        </p>
                        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                            DIRECTORATE GENERAL OF GST INTELLIGENCE (DGGI)
                        </h1>
                        <p className="text-xs font-semibold text-blue-400 font-mono">
                            {noticeData.form_title}
                        </p>
                        <p className="text-[11px] text-slate-400 italic">
                            [{noticeData.legal_framework}]
                        </p>
                    </div>

                    {/* Metadata Header Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono p-4 rounded-xl border border-slate-800 bg-slate-900/40 print:bg-white print:text-black">
                        <div className="space-y-1">
                            <div><span className="text-slate-400">Notice Reference:</span> <strong className="text-blue-400">{noticeData.notice_number}</strong></div>
                            <div><span className="text-slate-400">Target Conveyance:</span> <strong className="text-white print:text-black">{noticeData.target_vehicle}</strong></div>
                            <div><span className="text-slate-400">Addressee:</span> <span>{noticeData.carrier_designation}</span></div>
                        </div>
                        <div className="space-y-1 sm:text-right">
                            <div><span className="text-slate-400">Issued On:</span> <span>{new Date(noticeData.issued_at).toLocaleString("en-IN")}</span></div>
                            <div><span className="text-slate-400">Issuing Authority:</span> <strong>{noticeData.issuing_officer}</strong></div>
                            <div><span className="text-slate-400">Action Directive:</span> <span className="text-rose-400 font-bold">{noticeData.risk_evaluation.decision_action}</span></div>
                        </div>
                    </div>

                    {/* Statutory Violation Grounds */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold tracking-tight uppercase font-mono flex items-center gap-2 text-rose-400">
                            <AlertTriangle size={14} /> Statutory Grounds for Interception & Detention
                        </h3>
                        <div className="space-y-2">
                            {noticeData.statutory_grounds.map((g, idx) => (
                                <div key={idx} className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 text-xs flex items-start gap-3 print:bg-slate-50 print:text-black">
                                    <span className="font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60 shrink-0">
                                        {g.rule_id}
                                    </span>
                                    <div className="space-y-0.5">
                                        <strong className="text-rose-200 print:text-black">{g.rule}:</strong>
                                        <p className="text-slate-300 print:text-slate-800">{g.finding}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Declared Consignment Records Table */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold tracking-tight uppercase font-mono text-slate-300 flex items-center gap-2">
                            <FileText size={14} className="text-blue-400" /> Declared Consignment Documentation
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="uppercase text-[10px] tracking-wider border-b font-mono bg-slate-900/80 text-slate-400 border-slate-800 print:bg-slate-100 print:text-black">
                                    <tr>
                                        <th className="p-2.5">E-Way Bill No</th>
                                        <th className="p-2.5">Consignor GSTIN</th>
                                        <th className="p-2.5">Transit Route</th>
                                        <th className="p-2.5 text-right">Invoice Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                                    {noticeData.declared_consignments.map((e, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2.5 text-blue-400 font-bold">#{e.ewb_number}</td>
                                            <td className="p-2.5 text-slate-300 print:text-black">{e.consignor}</td>
                                            <td className="p-2.5 text-slate-400">{e.origin_pin} → {e.dest_pin}</td>
                                            <td className="p-2.5 text-right font-bold text-emerald-400">{formatINR(e.invoice_value_inr)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Security & Penalty Demand Box */}
                    <div className="p-5 rounded-2xl border border-amber-800/40 bg-amber-950/20 space-y-3 print:bg-slate-50 print:text-black">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono uppercase text-amber-400 flex items-center gap-2">
                                <Lock size={14} /> Statutory Security Demand (Section 129(1)(a))
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                                200% Penalty Mandatory
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
                            <div>
                                <span className="text-slate-400 text-[10px] block">Consignment Value</span>
                                <strong className="text-white print:text-black">{formatINR(noticeData.financial_demand.total_consignment_value_inr)}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[10px] block">Applicable Tax (18%)</span>
                                <strong className="text-amber-300">{formatINR(noticeData.financial_demand.estimated_tax_inr)}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[10px] block">Penalty (200%)</span>
                                <strong className="text-rose-400">{formatINR(noticeData.financial_demand.penalty_inr)}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[10px] block">Total Security Demand</span>
                                <strong className="text-emerald-400 text-sm">{formatINR(noticeData.financial_demand.total_security_demand_inr)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Operational Dispatch Directives */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-xs space-y-2">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1.5">
                                <Radio size={13} className="text-emerald-400 animate-pulse" />
                                Assigned Interception Checkpoint: <strong className="text-white print:text-black">{noticeData.dispatch_order.assigned_intercept_checkpoint}</strong>
                            </span>
                            <span className="text-slate-400">Detention Limit: <strong>24 Hours</strong></span>
                        </div>
                        <p className="text-slate-400 leading-relaxed text-[11px]">
                            {noticeData.dispatch_order.dispatch_directive}
                        </p>
                    </div>

                    {/* Signature Block */}
                    <div className="pt-6 border-t border-slate-800 flex justify-between items-end text-xs font-mono">
                        <div className="space-y-1 text-slate-500 text-[10px]">
                            <p>Verification Hash: SHA256:{noticeData.notice_number.split("/").pop()}</p>
                            <p>Automated Electronic Summons under Section 169 CGST Act</p>
                        </div>
                        <div className="text-right space-y-1">
                            <div className="h-10 w-36 border-b border-slate-600 ml-auto" />
                            <p className="font-bold text-white print:text-black">{noticeData.issuing_officer}</p>
                            <p className="text-slate-400 text-[10px]">{noticeData.issuing_authority}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
