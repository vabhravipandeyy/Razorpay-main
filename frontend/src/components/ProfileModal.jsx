import { useState } from "react";
import { X, User, Shield, KeyRound, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { changePassword } from "../api/admin";

export default function ProfileModal({ isOpen, onClose, user }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    if (!isOpen || !user) return null;

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        if (newPassword.length < 6) {
            setErrorMsg("New password must be at least 6 characters in length.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMsg("New passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            const res = await changePassword(currentPassword, newPassword, confirmPassword);
            setSuccessMsg(res.message || "Password updated successfully. Active sessions revoked.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to update password. Verify current password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                            <User size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Inspector Profile & Security</h3>
                            <p className="text-xs text-slate-400">Account identity & credential management</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
                    {/* User Info Details */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Full Name</span>
                            <p className="text-sm font-semibold text-white mt-0.5">{user.full_name || "N/A"}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Username</span>
                            <p className="text-sm font-mono font-bold text-blue-400 mt-0.5">{user.username}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Official Email</span>
                            <p className="text-xs font-mono text-slate-300 mt-0.5">{user.email}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Assigned Role</span>
                            <div className="mt-0.5">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                    user.role === "admin"
                                        ? "bg-purple-950 text-purple-300 border-purple-800"
                                        : "bg-blue-950 text-blue-300 border-blue-800"
                                }`}>
                                    {user.role}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Form */}
                    <form onSubmit={handleChangePassword} className="space-y-4 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                            <KeyRound size={16} className="text-indigo-400" />
                            <h4 className="text-sm font-bold text-white">Change Account Password</h4>
                        </div>

                        {successMsg && (
                            <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                                <CheckCircle2 size={16} className="shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        {errorMsg && (
                            <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                                    New Password (Min 6 chars)
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {loading ? "Updating Credentials..." : "Update Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
