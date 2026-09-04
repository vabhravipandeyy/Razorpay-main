import { useState, useEffect, useRef } from "react";
import { Search, Truck, ChevronDown, X, Sparkles, AlertCircle, Check } from "lucide-react";
import { getVehicleList } from "../api/analysis";

export default function VehicleSelector({ onSelect, selectedVehicle = "", loading = false }) {
    const [vehicles, setVehicles] = useState([]);
    const [query, setQuery] = useState(selectedVehicle || "");
    const [isOpen, setIsOpen] = useState(false);
    const [fetchingList, setFetchingList] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Sync input when selectedVehicle prop changes externally
    useEffect(() => {
        if (selectedVehicle) {
            setQuery(selectedVehicle);
        }
    }, [selectedVehicle]);

    // Fetch unique vehicles registry on mount
    useEffect(() => {
        const fetchVehicles = async () => {
            setFetchingList(true);
            setFetchError(false);
            try {
                const res = await getVehicleList();
                setVehicles(res.vehicles || []);
            } catch (err) {
                console.error("Failed to load vehicle list:", err);
                setFetchError(true);
            } finally {
                setFetchingList(false);
            }
        };

        fetchVehicles();
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredVehicles = vehicles.filter((v) =>
        v.toLowerCase().includes(query.trim().toLowerCase())
    );

    const handleSelectVehicle = (vehicle) => {
        const clean = vehicle.trim().toUpperCase();
        setQuery(clean);
        setIsOpen(false);
        onSelect(clean);
    };

    const handleKeyDown = (e) => {
        if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
            setIsOpen(true);
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev < filteredVehicles.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev > 0 ? prev - 1 : filteredVehicles.length - 1
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (isOpen && filteredVehicles.length > 0) {
                handleSelectVehicle(filteredVehicles[highlightedIndex] || filteredVehicles[0]);
            } else if (query.trim()) {
                handleSelectVehicle(query);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    const handleClear = () => {
        setQuery("");
        setIsOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative" ref={dropdownRef}>
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                                Vehicle Risk Intelligence Search
                            </h2>
                            <p className="text-xs text-slate-400">
                                Select or search registered vehicle for cross-dataset fraud & telemetry verification
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-full font-mono text-slate-300">
                            {fetchingList ? (
                                <span className="animate-pulse">Loading Registry...</span>
                            ) : (
                                <strong>{vehicles.length} Vehicles In Registry</strong>
                            )}
                        </span>
                    </div>
                </div>

                {/* Searchable Dropdown Input */}
                <div className="relative mt-2">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 text-slate-400 shrink-0 pointer-events-none" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="SEARCH OR SELECT VEHICLE NUMBER (E.G. WB37C8894)..."
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value.toUpperCase());
                                setIsOpen(true);
                                setHighlightedIndex(0);
                            }}
                            onFocus={() => setIsOpen(true)}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 rounded-2xl pl-12 pr-28 py-4 text-base font-mono font-bold text-white placeholder-slate-500 uppercase tracking-wider outline-none transition-all shadow-inner"
                        />

                        <div className="absolute right-3 flex items-center gap-1.5">
                            {query && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                    title="Clear"
                                >
                                    <X size={16} />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {/* Dropdown Menu */}
                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-2xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-900">
                            {filteredVehicles.length > 0 ? (
                                filteredVehicles.map((vehicle, index) => {
                                    const isSelected = vehicle === selectedVehicle;
                                    const isHighlighted = index === highlightedIndex;
                                    return (
                                        <button
                                            key={vehicle}
                                            type="button"
                                            onClick={() => handleSelectVehicle(vehicle)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={`w-full px-5 py-3.5 flex items-center justify-between text-left font-mono text-sm transition-colors ${
                                                isHighlighted
                                                    ? "bg-blue-600/20 text-white"
                                                    : isSelected
                                                    ? "bg-slate-900 text-blue-400 font-bold"
                                                    : "text-slate-300 hover:bg-slate-900"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Truck size={16} className={isSelected ? "text-blue-400" : "text-slate-500"} />
                                                <span className="font-bold tracking-wider">{vehicle}</span>
                                            </div>
                                            {isSelected && (
                                                <span className="flex items-center gap-1 text-xs text-blue-400 font-sans font-semibold">
                                                    <Check size={14} /> Active
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="px-5 py-6 text-center text-xs text-slate-400">
                                    <AlertCircle size={20} className="mx-auto text-slate-500 mb-1.5" />
                                    <p className="font-semibold text-slate-300">No vehicles match "{query}"</p>
                                    <p className="mt-1 text-slate-500">Press Enter to analyze "{query}" directly.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick Selection Tags */}
                <div className="mt-4 flex items-center gap-2 flex-wrap text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500 font-semibold">
                        <Sparkles size={14} className="text-blue-400" />
                        Quick Test Vehicles:
                    </span>
                    {(vehicles.slice(0, 5).length > 0 ? vehicles.slice(0, 5) : ["WB37C8894", "WB37C8931", "WB37C8999"]).map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => handleSelectVehicle(tag)}
                            className="px-2.5 py-1 bg-slate-950/80 hover:bg-blue-600/20 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-slate-300 font-mono rounded-lg transition-all text-xs"
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
