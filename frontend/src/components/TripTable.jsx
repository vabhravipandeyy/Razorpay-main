import { useTheme } from "../context/ThemeContext";
import { Route, MapPin, ArrowRight, CreditCard } from "lucide-react";

export default function TripTable({ data }) {
    const { isDark } = useTheme();
    if (!data || !data.trips || data.trips.length === 0) return null;

    const containerClass = isDark
        ? "bg-[#0d121f] border-slate-800/90 text-slate-100 shadow-xl"
        : "bg-white border-slate-200 text-slate-900 shadow-sm";

    return (
        <div className={`rounded-2xl border p-6 sm:p-7 space-y-5 ${containerClass}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div>
                    <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                            Declared Transport Movements
                        </h2>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            E-Way Bill itineraries correlated with verified toll plaza crossings
                        </p>
                    </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                }`}>
                    {data.trips.length} Declared Trips
                </span>
            </div>

            <div className={`overflow-x-auto rounded-xl border ${
                isDark ? "border-slate-800" : "border-slate-200"
            }`}>
                <table className={`w-full text-left text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    <thead>
                        <tr className={`uppercase text-[10px] tracking-wider border-b font-bold font-mono ${
                            isDark ? "bg-slate-900/80 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                            <th className="px-4 py-3">E-Way Bill #</th>
                            <th className="px-4 py-3">Route Vector</th>
                            <th className="px-4 py-3 text-center">Distance</th>
                            <th className="px-4 py-3 text-center">Direction</th>
                            <th className="px-4 py-3 text-right">Invoice Value</th>
                            <th className="px-4 py-3 text-center">FASTag Tolls</th>
                            <th className="px-4 py-3">Validity Window</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-slate-800/80" : "divide-slate-100 bg-white"}`}>
                        {data.trips.map((trip) => (
                            <tr key={trip.ewb_no} className={isDark ? "hover:bg-slate-800/40 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                                <td className={`px-4 py-3.5 font-mono font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                    #{trip.ewb_no}
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className={`flex items-center gap-1.5 font-mono font-semibold text-xs ${isDark ? "text-white" : "text-slate-900"}`}>
                                        <MapPin size={13} className="text-emerald-500 shrink-0" />
                                        <span>PIN {trip.from_pin}</span>
                                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                                        <MapPin size={13} className="text-rose-500 shrink-0" />
                                        <span>PIN {trip.to_pin}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 text-center font-mono font-semibold text-xs">
                                    {Number(trip.distance).toFixed(1)} km
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                        isDark ? "bg-blue-950/50 border-blue-800/40 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                                    }`}>
                                        {trip.direction}
                                    </span>
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono font-bold text-xs text-emerald-600">
                                    ₹{Number(trip.invoice_amount || 0).toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3.5 text-center font-mono text-xs">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-bold ${
                                        isDark ? "bg-purple-950/40 border-purple-800/40 text-purple-300" : "bg-purple-50 border-purple-200 text-purple-700"
                                    }`}>
                                        <CreditCard size={12} />
                                        {trip.tolls?.length || 0}
                                    </span>
                                </td>
                                <td className="px-4 py-3.5 text-xs font-mono">
                                    <div className={`space-y-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        <div><span>From:</span> {trip.start_time ? new Date(trip.start_time).toLocaleString() : "N/A"}</div>
                                        <div><span>Until:</span> {trip.end_time ? new Date(trip.end_time).toLocaleString() : "N/A"}</div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
