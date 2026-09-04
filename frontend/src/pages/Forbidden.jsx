import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft, Lock } from "lucide-react";

export default function Forbidden() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                    <ShieldX size={36} />
                </div>

                <div className="space-y-2">
                    <span className="px-3 py-1 bg-red-950/80 border border-red-800 text-red-300 text-xs font-mono font-bold rounded-full uppercase tracking-wider">
                        403 Access Forbidden
                    </span>
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        Administrative Access Required
                    </h1>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Your account does not possess the required RBAC permissions to access this administrative resource. Please contact your system administrator for role elevation.
                    </p>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2 text-left">
                    <Lock size={15} className="text-amber-400 shrink-0" />
                    <span>Protected under Enterprise Role-Based Access Control (RBAC).</span>
                </div>

                <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                    <ArrowLeft size={16} />
                    <span>Return to Risk Dashboard</span>
                </Link>
            </div>
        </div>
    );
}
