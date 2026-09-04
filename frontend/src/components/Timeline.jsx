import { useTheme } from "../context/ThemeContext";
import { Calendar, Clock, CreditCard } from "lucide-react";

export default function Timeline({ data }) {
    const { isDark } = useTheme();
    if (!data || !data.trips || data.trips.length === 0) return null;

    const events = [];

    data.trips.forEach((trip) => {
        if (trip.start_time) {
            events.push({
                type: "EWB_START",
                time: new Date(trip.start_time),
                title: `E-Way Bill #${trip.ewb_no} Issued`,
                location: `Origin PIN ${trip.from_pin} → Destination PIN ${trip.to_pin}`,
                details: `Declared Distance: ${Number(trip.distance).toFixed(1)} km | Invoice: ₹${Number(trip.invoice_amount || 0).toLocaleString("en-IN")}`,
                severity: "INFO",
            });
        }

        (trip.tolls || []).forEach((toll) => {
            if (toll.time) {
                events.push({
                    type: "FASTAG_CROSSING",
                    time: new Date(toll.time),
                    title: `Toll Scan: ${toll.name}`,
                    location: `Highway: ${toll.highway || "NH/SH"} | Toll ID: ${toll.toll_id}`,
                    details: `Status: ${toll.status === "A" ? "Authorized" : toll.status || "Recorded"}`,
                    severity: "NORMAL",
                });
            }
        });

        if (trip.end_time) {
            events.push({
                type: "EWB_END",
                time: new Date(trip.end_time),
                title: `E-Way Bill #${trip.ewb_no} Expiry`,
                location: `Destination PIN ${trip.to_pin}`,
                details: `Validity window concluded`,
                severity: "INFO",
            });
        }
    });

    events.sort((a, b) => a.time - b.time);

    const containerClass = isDark
        ? "bg-[#0d121f] border-slate-800/90 text-slate-100 shadow-xl"
        : "bg-white border-slate-200 text-slate-900 shadow-sm";

    return (
        <div className={`rounded-2xl border p-6 sm:p-7 space-y-6 ${containerClass}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div>
                    <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                            FASTag & E-Way Bill Timeline
                        </h2>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Sequential chronological trace of vehicle checkpoints
                        </p>
                    </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                }`}>
                    {events.length} Telemetry Events
                </span>
            </div>

            <div className={`space-y-5 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 ${
                isDark ? "before:bg-slate-800" : "before:bg-slate-200"
            }`}>
                {events.map((evt, index) => {
                    const isEwb = evt.type.startsWith("EWB");
                    return (
                        <div key={index} className="flex gap-4 relative">
                            {/* Timeline Node */}
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 text-[10px] font-bold ${
                                isEwb
                                    ? isDark ? "bg-slate-950 border-blue-500 text-blue-400" : "bg-white border-blue-500 text-blue-600 shadow-sm"
                                    : isDark ? "bg-slate-950 border-purple-500 text-purple-400" : "bg-white border-purple-500 text-purple-600 shadow-sm"
                            }`}>
                                {isEwb ? index + 1 : <CreditCard size={12} />}
                            </div>

                            {/* Event Card */}
                            <div className={`flex-1 rounded-xl p-4 border transition-all ${
                                isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50/70 border-slate-200"
                            }`}>
                                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 mb-2.5 ${
                                    isDark ? "border-slate-800" : "border-slate-200"
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <h4 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{evt.title}</h4>
                                        <span className={`text-[10px] px-2 py-0.2 rounded font-mono font-bold uppercase border ${
                                            isEwb
                                                ? isDark ? "bg-blue-950/50 text-blue-300 border-blue-800/40" : "bg-blue-50 text-blue-700 border-blue-200"
                                                : isDark ? "bg-purple-950/50 text-purple-300 border-purple-800/40" : "bg-purple-50 text-purple-700 border-purple-200"
                                        }`}>
                                            {evt.type.replace("_", " ")}
                                        </span>
                                    </div>

                                    <div className={`text-[11px] flex items-center gap-1 font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        <Calendar size={12} />
                                        <span>{evt.time.toLocaleString("en-IN")}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                    <div className={`p-2.5 rounded-lg border ${
                                        isDark ? "bg-slate-950/60 border-slate-800" : "bg-white border-slate-200"
                                    }`}>
                                        <p className={`text-[10px] uppercase font-bold mb-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                            Checkpoint Location
                                        </p>
                                        <p className={`font-semibold text-xs ${isDark ? "text-slate-200" : "text-slate-800"}`}>{evt.location}</p>
                                    </div>

                                    <div className={`p-2.5 rounded-lg border ${
                                        isDark ? "bg-slate-950/60 border-slate-800" : "bg-white border-slate-200"
                                    }`}>
                                        <p className={`text-[10px] uppercase font-bold mb-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                            Event Telemetry
                                        </p>
                                        <p className={`font-mono text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>{evt.details}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
