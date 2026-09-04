import { Search, Shield, Truck } from "lucide-react";

export default function EmptyState() {
    return (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 sm:p-16 text-center max-w-2xl mx-auto shadow-xl backdrop-blur-md">
            <div className="w-20 h-20 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-center justify-center text-blue-400 mx-auto mb-6 shadow-inner">
                <Truck size={38} />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Vehicle Fraud Intelligence Engine
            </h2>

            <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">
                Enter any vehicle registration number above to run automated cross-verification between E-Way Bill distance metrics and FASTag toll passage history.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-slate-400">
                <span className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-1.5">
                    <Shield size={14} className="text-emerald-400" />
                    Spatial Route Bearing
                </span>
                <span className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-1.5">
                    <Shield size={14} className="text-blue-400" />
                    Overlapping EWB Detection
                </span>
                <span className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-1.5">
                    <Shield size={14} className="text-purple-400" />
                    Impossible Toll Speed Checks
                </span>
            </div>
        </div>
    );
}