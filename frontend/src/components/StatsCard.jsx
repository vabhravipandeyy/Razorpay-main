import { FileText, CreditCard, ShieldAlert, TrendingUp } from "lucide-react";

export default function StatsCard({ data }) {
    if (!data) return null;

    const stats = [
        {
            title: "Risk Score",
            value: data.risk_score,
            icon: <ShieldAlert size={22} />,
            color: "bg-red-500/10 text-red-400 border-red-500/20",
        },
        {
            title: "Risk Level",
            value: data.risk_level,
            icon: <TrendingUp size={22} />,
            color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        },
        {
            title: "E-Way Bills",
            value: data.eway_bill_count,
            icon: <FileText size={22} />,
            color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        },
        {
            title: "FASTag Scans",
            value: data.fastag_count,
            icon: <CreditCard size={22} />,
            color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <div
                    key={stat.title}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg backdrop-blur-md hover:border-slate-700 transition-all"
                >
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                        <h3 className="text-2xl font-black text-white mt-1">{stat.value}</h3>
                    </div>
                    <div className={`p-3 rounded-xl border ${stat.color}`}>{stat.icon}</div>
                </div>
            ))}
        </div>
    );
}