import { useTheme } from "../context/ThemeContext";

export default function Loading({ variant = "dashboard" }) {
    const { isDark } = useTheme();

    const shimmerBg = isDark ? "bg-slate-800/60" : "bg-slate-200/90";
    const subShimmerBg = isDark ? "bg-slate-800/40" : "bg-slate-100";
    const cardBg = isDark
        ? "bg-[#0d121f]/70 border-slate-800/80"
        : "bg-white border-slate-200 shadow-sm";

    // 1. Table Row Skeleton (for Cases, Registry, Audit Logs)
    if (variant === "table") {
        return (
            <div className={`rounded-2xl border p-4 sm:p-5 space-y-4 animate-pulse select-none ${cardBg}`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
                    <div className={`h-4 w-40 rounded ${shimmerBg}`} />
                    <div className={`h-4 w-20 rounded ${shimmerBg}`} />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-800/20 last:border-b-0">
                            <div className="flex items-center gap-3 w-1/3">
                                <div className={`w-8 h-8 rounded-lg shrink-0 ${shimmerBg}`} />
                                <div className="space-y-1.5 w-full">
                                    <div className={`h-3.5 w-3/4 rounded ${shimmerBg}`} />
                                    <div className={`h-2.5 w-1/2 rounded ${subShimmerBg}`} />
                                </div>
                            </div>
                            <div className={`h-3 w-24 rounded ${shimmerBg}`} />
                            <div className={`h-5 w-20 rounded-full ${shimmerBg}`} />
                            <div className={`h-7 w-20 rounded-lg ${subShimmerBg}`} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 2. Card Grid Skeleton (for Suspicious Vehicles directory)
    if (variant === "cards") {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse select-none">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`rounded-2xl border p-5 space-y-4 ${cardBg}`}>
                        <div className="flex items-center justify-between">
                            <div className={`h-6 w-28 rounded-xl ${shimmerBg}`} />
                            <div className={`h-4 w-16 rounded-full ${shimmerBg}`} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <div className={`h-3 w-16 rounded ${subShimmerBg}`} />
                                <div className={`h-3 w-12 rounded ${shimmerBg}`} />
                            </div>
                            <div className={`h-1.5 w-full rounded-full ${subShimmerBg}`} />
                        </div>
                        <div className={`h-3 w-4/5 rounded ${subShimmerBg}`} />
                        <div className={`h-8 w-full rounded-xl ${subShimmerBg}`} />
                    </div>
                ))}
            </div>
        );
    }

    // 3. Detail Dossier Skeleton (for Active Vehicle Analysis)
    if (variant === "detail") {
        return (
            <div className="space-y-5 animate-pulse select-none">
                {/* Hero Skeleton */}
                <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`h-8 w-36 rounded-xl ${shimmerBg}`} />
                            <div className={`h-6 w-20 rounded-full ${shimmerBg}`} />
                        </div>
                        <div className={`h-6 w-24 rounded-lg ${subShimmerBg}`} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        {[1, 2, 3, 4].map((k) => (
                            <div key={k} className={`h-16 rounded-xl border p-3 space-y-2 ${isDark ? "border-slate-800 bg-[#090d16]" : "border-slate-100 bg-slate-50"}`}>
                                <div className={`h-2.5 w-14 rounded ${subShimmerBg}`} />
                                <div className={`h-4 w-20 rounded ${shimmerBg}`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sub-card grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((k) => (
                        <div key={k} className={`h-32 rounded-2xl border p-4 space-y-3 ${cardBg}`}>
                            <div className={`h-3.5 w-24 rounded ${shimmerBg}`} />
                            <div className={`h-6 w-16 rounded ${shimmerBg}`} />
                            <div className={`h-2.5 w-full rounded ${subShimmerBg}`} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 4. Default Dashboard Overview Skeleton
    return (
        <div className="w-full space-y-5 py-2 animate-pulse select-none">
            {/* Top Bar Skeleton */}
            <div className="flex items-center justify-between">
                <div className={`h-5 w-44 rounded-lg ${shimmerBg}`} />
                <div className={`h-5 w-24 rounded-lg ${subShimmerBg}`} />
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-24 rounded-2xl border p-4 space-y-2.5 ${cardBg}`}>
                        <div className={`h-3 w-20 rounded ${subShimmerBg}`} />
                        <div className={`h-6 w-28 rounded ${shimmerBg}`} />
                        <div className={`h-2.5 w-36 rounded ${subShimmerBg}`} />
                    </div>
                ))}
            </div>

            {/* Main Visual Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className={`lg:col-span-2 h-72 rounded-2xl border p-5 space-y-3 ${cardBg}`}>
                    <div className={`h-4 w-40 rounded ${shimmerBg}`} />
                    <div className={`h-52 w-full rounded-xl ${subShimmerBg}`} />
                </div>
                <div className={`h-72 rounded-2xl border p-5 space-y-3 ${cardBg}`}>
                    <div className={`h-4 w-32 rounded ${shimmerBg}`} />
                    <div className={`h-52 w-full rounded-xl ${subShimmerBg}`} />
                </div>
            </div>
        </div>
    );
}
