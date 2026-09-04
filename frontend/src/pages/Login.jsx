import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    ShieldCheck,
    CheckCircle2,
    Eye,
    EyeOff
} from "lucide-react";

export default function Login() {
    const { login, register } = useAuth();
    const navigate = useNavigate();

    // Mode state
    const [isSignUp, setIsSignUp] = useState(false);

    // Form submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Flash highlight feedback when auto-filling demo accounts
    const [isFlashing, setIsFlashing] = useState(false);

    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirm_password: "",
        email: "",
        full_name: "",
    });

    const passwordChecks = {
        minLength: formData.password.length >= 6,
        hasUpper: /[A-Z]/.test(formData.password),
        hasLower: /[a-z]/.test(formData.password),
        hasNumber: /[0-9]/.test(formData.password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
    };

    const isPasswordValid = Object.values(passwordChecks).every(Boolean);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const triggerFieldFlash = () => {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 800);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            if (isSignUp) {
                if (!formData.username || !formData.password || !formData.email) {
                    throw new Error("Please complete all required fields.");
                }
                if (!passwordChecks.minLength) {
                    throw new Error("Password must be at least 6 characters in length.");
                }
                if (formData.password !== formData.confirm_password) {
                    throw new Error("Passwords do not match. Please verify confirmation password.");
                }

                await register({
                    username: formData.username.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                    confirm_password: formData.confirm_password,
                    full_name: formData.full_name.trim(),
                });

                await login(formData.username.trim(), formData.password);
                navigate("/");
            } else {
                if (!formData.username || !formData.password) {
                    throw new Error("Please enter your username and password.");
                }

                await login(formData.username.trim(), formData.password);
                navigate("/");
            }
        } catch (err) {
            setIsSubmitting(false);
            console.error("Auth error:", err);
            const msg =
                err.response?.data?.detail ||
                err.message ||
                "Authentication failed. Please verify credentials.";
            setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
    };

    return (
        <div className="min-h-screen bg-[#07090e] font-sans text-slate-100 antialiased selection:bg-blue-600 selection:text-white relative overflow-hidden">
            <div className="min-h-screen flex flex-col md:flex-row bg-[#07090e]">
                
                {/* ----------------------------------------------------- */}
                {/* LEFT SIDE: Institutional Visual Showcase (Clean Black) */}
                {/* ----------------------------------------------------- */}
                <section className="relative w-full md:w-1/2 min-h-[35vh] md:min-h-screen flex flex-col justify-between p-8 md:p-14 lg:p-20 overflow-hidden bg-[#07090e] border-b md:border-b-0 md:border-r border-slate-800/80 shrink-0">
                    
                    {/* Brand Identifier (No Icon, Larger Space Grotesk Font) */}
                    <div className="relative z-10 flex items-center">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-['Space_Grotesk']">
                            GST Sentinel
                        </span>
                    </div>

                    {/* Center Hero Copy */}
                    <div className="relative z-10 max-w-lg space-y-5 my-auto py-8">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
                            Reconcile Every Movement. <br />
                            <span className="text-slate-400 font-semibold block mt-1">Expose Hidden Risk.</span>
                        </h1>

                        <p className="text-sm lg:text-base text-slate-300 leading-relaxed font-normal">
                            Automated cross-referencing of FASTag RFID toll transactions with active E-Way Bill freight declarations to detect impossible speeds, route anomalies, and tax evasion.
                        </p>
                    </div>

                    {/* Bottom Tag */}
                    <div className="relative z-10 text-[11px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Official GST Enforcement Intelligence Portal</span>
                    </div>
                </section>

                {/* ----------------------------------------------------- */}
                {/* RIGHT SIDE: Authentication Form Panel (Clean Black) */}
                {/* ----------------------------------------------------- */}
                <section className="flex-1 flex flex-col items-center justify-center py-12 md:py-16 px-6 sm:px-12 lg:px-20 bg-[#05070a] relative min-h-screen">
                    <div className="w-full max-w-sm z-10 my-auto space-y-7">
                        
                        {/* Header Titles */}
                        <div className="space-y-1.5">
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Space_Grotesk']">
                                {isSignUp ? "Create Officer Account" : "Officer Authentication"}
                            </h2>
                            <p className="text-xs text-slate-400">
                                {isSignUp
                                    ? "Register an authorized GST surveillance terminal identity"
                                    : "Enter your official credentials to access telemetry records"}
                            </p>
                        </div>

                        {/* Error Notice */}
                        {error && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2.5 transition-all animate-shake">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                <span className="leading-snug">{error}</span>
                            </div>
                        )}

                        {/* Success Notice */}
                        {successMessage && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-start gap-2.5 transition-all">
                                <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                                <span className="leading-snug">{successMessage}</span>
                            </div>
                        )}

                        {/* Auth Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* Full Name (Sign Up Only) */}
                            {isSignUp && (
                                <div>
                                    <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                                        Full Officer Name
                                    </label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        required
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        placeholder="e.g. Inspector R. Sharma"
                                        className="w-full bg-[#0b0f19] border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:scale-[1.01] transition-all duration-200"
                                    />
                                </div>
                            )}

                            {/* Official Email (Sign Up Only) */}
                            {isSignUp && (
                                <div>
                                    <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                                        Official Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="officer@gst-analytics.gov.in"
                                        className="w-full bg-[#0b0f19] border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:scale-[1.01] transition-all duration-200"
                                    />
                                </div>
                            )}

                            {/* Username */}
                            <div>
                                <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                                    Official Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Enter username (e.g. ins1, admin)"
                                    className={`w-full bg-[#0b0f19] border text-white rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all duration-200 hover:border-slate-700 focus:scale-[1.01] ${
                                        isFlashing
                                            ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                                            : "border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    }`}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400">
                                        Access Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-all duration-200 active:scale-95"
                                    >
                                        {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                        <span>{showPassword ? "Hide" : "Show"}</span>
                                    </button>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter password"
                                    className={`w-full bg-[#0b0f19] border text-white rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all duration-200 hover:border-slate-700 focus:scale-[1.01] ${
                                        isFlashing
                                            ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                                            : "border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    }`}
                                />
                            </div>

                            {/* Confirm Password (Sign Up Only) */}
                            {isSignUp && (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400">
                                            Confirm Password
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-all duration-200 active:scale-95"
                                        >
                                            {showConfirmPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                            <span>{showConfirmPassword ? "Hide" : "Show"}</span>
                                        </button>
                                    </div>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirm_password"
                                        required
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        placeholder="Re-enter password"
                                        className="w-full bg-[#0b0f19] border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:scale-[1.01] transition-all duration-200"
                                    />
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] hover:-translate-y-0.5 text-white text-xs font-bold transition-all duration-200 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-50 mt-2"
                            >
                                {isSubmitting
                                    ? "Authenticating Terminal..."
                                    : isSignUp
                                    ? "Register Officer Identity"
                                    : "Access Surveillance Console"}
                            </button>
                        </form>

                        {/* Toggle Mode */}
                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError("");
                                    setSuccessMessage("");
                                }}
                                className="text-xs text-slate-400 hover:text-white transition-all duration-200 hover:underline"
                            >
                                {isSignUp
                                    ? "Already have official credentials? Access Console"
                                    : "Need authorized enrollment? Request Account"}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
