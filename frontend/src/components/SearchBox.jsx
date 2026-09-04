import { useState, useEffect } from "react";
import { Search, Sparkles, Truck, ArrowRight } from "lucide-react";

export default function SearchBox({ onSearch, loading, initialValue = "" }) {
    const [vehicleNumber, setVehicleNumber] = useState(initialValue);

    useEffect(() => {
        if (initialValue) {
            setVehicleNumber(initialValue);
        }
    }, [initialValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!vehicleNumber.trim()) return;
        onSearch(vehicleNumber.trim().toUpperCase());
    };

    const handleQuickSearch = (val) => {
        setVehicleNumber(val);
        onSearch(val);
    };

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Ambient Background Blur */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
                        <Truck size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                            Single Vehicle Fraud Lookup
                        </h2>
                        <p className="text-xs text-slate-400">
                            Analyze E-Way Bill distance, FASTag toll scans, speed limits & route bearing
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="relative mt-2">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 text-slate-400 shrink-0" size={20} />
                        <input
                            type="text"
                            placeholder="ENTER VEHICLE NUMBER (E.G. WB37C8894)..."
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                            className="w-full bg-slate-950/80 border border-slate-700/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 rounded-2xl pl-12 pr-36 py-4 text-base font-mono font-bold text-white placeholder-slate-500 uppercase tracking-wider outline-none transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={loading || !vehicleNumber.trim()}
                            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all text-sm"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Analyze</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Demo vehicle quick tags */}
                <div className="mt-4 flex items-center gap-2 flex-wrap text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Sparkles size={14} className="text-blue-400" />
                        Quick Test Vehicles:
                    </span>
                    {["WB37C8894", "WB37C8931", "WB37C8999", "ABC1234"].map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => handleQuickSearch(tag)}
                            className="px-2.5 py-1 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono rounded-lg transition-colors text-xs"
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}