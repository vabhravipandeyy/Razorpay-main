import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import {
    X,
    Bot,
    User,
    Send,
    Sparkles,
    ShieldAlert,
    BookOpen,
    ThumbsUp,
    ThumbsDown,
    RefreshCw,
    ExternalLink,
    Minimize2,
    Maximize2,
    Truck,
    HelpCircle
} from "lucide-react";
import { sendCopilotMessage } from "../api/copilot";

// Clean Markdown / Rich Text Renderer to prevent raw ### and ** syntax
function FormattedMessageContent({ content, isDark }) {
    if (!content) return null;

    const lines = content.split("\n");

    return (
        <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={idx} className="h-1" />;

                // H3 Header (### Header)
                if (trimmed.startsWith("### ")) {
                    const text = trimmed.replace(/^###\s+/, "");
                    return (
                        <h3
                            key={idx}
                            className={`text-sm sm:text-base font-bold tracking-tight mt-2 mb-1 ${
                                isDark ? "text-white" : "text-slate-900"
                            }`}
                        >
                            {parseInlineMarkdown(text, isDark)}
                        </h3>
                    );
                }

                // H4 Header (#### Header)
                if (trimmed.startsWith("#### ")) {
                    const text = trimmed.replace(/^####\s+/, "");
                    return (
                        <h4
                            key={idx}
                            className={`text-xs sm:text-sm font-bold tracking-tight mt-1.5 mb-0.5 ${
                                isDark ? "text-slate-200" : "text-slate-800"
                            }`}
                        >
                            {parseInlineMarkdown(text, isDark)}
                        </h4>
                    );
                }

                // Bullet item (- item or * item)
                if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                    const text = trimmed.replace(/^[-*]\s+/, "");
                    return (
                        <div key={idx} className="flex items-start gap-2 pl-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                                {parseInlineMarkdown(text, isDark)}
                            </span>
                        </div>
                    );
                }

                // Numbered list (1. item)
                if (/^\d+\.\s+/.test(trimmed)) {
                    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
                    if (numMatch) {
                        return (
                            <div key={idx} className="flex items-start gap-2 pl-1">
                                <span className={`font-mono font-bold text-xs shrink-0 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                    {numMatch[1]}.
                                </span>
                                <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                                    {parseInlineMarkdown(numMatch[2], isDark)}
                                </span>
                            </div>
                        );
                    }
                }

                // Standard paragraph
                return (
                    <p key={idx} className={isDark ? "text-slate-300" : "text-slate-700"}>
                        {parseInlineMarkdown(trimmed, isDark)}
                    </p>
                );
            })}
        </div>
    );
}

// Parses inline bold (**text**), inline code (`code`), and italics (*text*)
function parseInlineMarkdown(text, isDark) {
    if (!text) return "";

    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

    return parts.map((part, i) => {
        if (!part) return null;

        // Bold (**text**)
        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
            return (
                <strong key={i} className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {part.slice(2, -2)}
                </strong>
            );
        }

        // Inline Code (`code`)
        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
            return (
                <code
                    key={i}
                    className={`font-mono text-xs px-1.5 py-0.5 rounded border ${
                        isDark ? "bg-slate-900 border-slate-700 text-blue-300" : "bg-slate-100 border-slate-200 text-blue-700"
                    }`}
                >
                    {part.slice(1, -1)}
                </code>
            );
        }

        // Italics (*text*)
        if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
            return (
                <em key={i} className="italic text-slate-400">
                    {part.slice(1, -1)}
                </em>
            );
        }

        return part;
    });
}

export default function CopilotDrawer({ isOpen, onClose, onOpen, activeVehicleNumber }) {
    const { isDark } = useTheme();
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem("gst_copilot_chat_history");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [feedbackState, setFeedbackState] = useState({});
    const [isMinimized, setIsMinimized] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Save chat history to localStorage
    useEffect(() => {
        try {
            if (messages.length > 0) {
                localStorage.setItem("gst_copilot_chat_history", JSON.stringify(messages));
            }
        } catch (e) {
            console.warn("Failed to persist copilot messages:", e);
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const initialGreeting = {
                role: "assistant",
                content: activeVehicleNumber
                    ? `### GST Risk Copilot Active\n\nI am analyzing vehicle **\`${activeVehicleNumber}\`**. Ask me why this vehicle is flagged, request a breakdown of suspicious FASTag movements, or check applicable GST Rule 138 provisions.`
                    : "### GST Risk Copilot Active\n\nI can provide factual investigation briefs, explain statutory GST rules, evaluate FASTag speed anomalies, and verify E-Way Bill validity periods. Select a vehicle or ask any GST regulatory question.",
                sources: [],
                evidence: [],
                created_at: new Date().toISOString()
            };
            setMessages([initialGreeting]);
        }
    }, [isOpen, activeVehicleNumber]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
        }
    }, [messages, loading, isMinimized, isOpen]);

    const handleSend = async (textToSend) => {
        const query = textToSend || inputValue;
        if (!query.trim() || loading) return;

        const userMsg = {
            role: "user",
            content: query.trim(),
            created_at: new Date().toISOString()
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setLoading(true);

        try {
            const data = await sendCopilotMessage(query.trim(), activeVehicleNumber, sessionId);

            if (data.session_id) {
                setSessionId(data.session_id);
            }

            const assistantMsg = {
                role: "assistant",
                content: data.answer,
                sources: data.sources || [],
                evidence: data.evidence_references || [],
                tool_usage: data.tool_usage || [],
                created_at: new Date().toISOString()
            };

            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
            console.error("Copilot query failed:", err);
            const errorMsg = {
                role: "assistant",
                content: "**Service Notice:** Unable to complete Copilot inquiry. Please verify network connectivity or sign in again.",
                sources: [],
                evidence: [],
                created_at: new Date().toISOString()
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handlePromptChip = (chipText) => {
        handleSend(chipText);
    };

    const handleNewChat = () => {
        setSessionId(null);
        const resetMessages = [
            {
                role: "assistant",
                content: activeVehicleNumber
                    ? `New audit inquiry started for **\`${activeVehicleNumber}\`**. How may I assist your review?`
                    : "New general inquiry session started. Ask any GST compliance or vehicle question.",
                sources: [],
                evidence: [],
                created_at: new Date().toISOString()
            }
        ];
        setMessages(resetMessages);
        localStorage.setItem("gst_copilot_chat_history", JSON.stringify(resetMessages));
    };

    const handleFeedback = (idx, type) => {
        setFeedbackState((prev) => ({
            ...prev,
            [idx]: type
        }));
    };

    // =========================================================================
    // 1. FLOATING "NEED HELP?" LAUNCHER BUTTON (When Closed)
    // =========================================================================
                if (!isOpen) {
        return (
            <div className="fixed bottom-5 right-5 z-40 pointer-events-auto">
                <button
                    type="button"
                    onClick={onOpen}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-lg transition-all duration-200 hover:scale-105 select-none ${
                        isDark
                            ? "bg-[#0b0f19] hover:bg-slate-800 text-slate-200 border-slate-700/80 shadow-black/50"
                            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-slate-300/40"
                    }`}
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-xs font-semibold tracking-tight">Need Help</span>
                </button>
            </div>
        );
    }

    const quickChips = activeVehicleNumber
        ? [
              "Why is this vehicle considered high risk?",
              "Show suspicious FASTag speed telemetry",
              "Explain the route bearing mismatch",
              "What are the E-Way bill validity rules under GST?",
              "What should an investigator review next?"
          ]
        : [
              "What is an E-Way Bill under Rule 138?",
              "What is the validity period of an E-Way bill for 500 km?",
              "What happens if FASTag records no toll crossings?",
              "Explain duplicate invoice recycling penalties"
          ];

    const containerStyle = isDark
        ? "bg-[#0e1320]/95 border-slate-800 text-slate-100 shadow-2xl shadow-black/60"
        : "bg-white/95 border-slate-200 text-slate-900 shadow-2xl shadow-slate-400/30";

    const bubbleStyle = isDark
        ? "bg-slate-900 border border-slate-800 text-slate-200"
        : "bg-slate-50 border border-slate-200 text-slate-800";

    // =========================================================================
    // 2. FLOATING NON-BLOCKING COPILOT WINDOW (When Open)
    // =========================================================================
    return (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-auto transition-all duration-200 ease-out">
            <div
                className={`w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl border backdrop-blur-xl flex flex-col transition-all overflow-hidden ${containerStyle} ${
                    isMinimized ? "h-14" : "h-[620px] max-h-[88vh]"
                }`}
            >
                {/* Header Bar */}
                <div
                    className={`p-3.5 border-b flex items-center justify-between cursor-pointer select-none ${
                        isDark ? "border-slate-800 bg-[#090d16]" : "border-slate-100 bg-slate-50/80"
                    }`}
                    onClick={() => isMinimized && setIsMinimized(false)}
                >
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${
                            isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200"
                        }`}>
                            <Bot size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className={`text-xs sm:text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                                    GST Risk Copilot
                                </h3>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${
                                    isDark ? "bg-blue-950 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                                }`}>
                                    Grok RAG
                                </span>
                            </div>
                            {activeVehicleNumber ? (
                                <p className={`text-[11px] font-mono flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    <Truck size={10} />
                                    <span>{activeVehicleNumber}</span>
                                </p>
                            ) : (
                                <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Regulatory & Telemetry Copilot
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={handleNewChat}
                            title="Start New Chat"
                            className={`p-1.5 rounded-lg border transition-colors ${
                                isDark ? "bg-slate-800 text-slate-400 hover:text-white border-slate-700" : "bg-white text-slate-600 hover:text-slate-900 border-slate-200"
                            }`}
                        >
                            <RefreshCw size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsMinimized((prev) => !prev)}
                            title={isMinimized ? "Expand" : "Minimize"}
                            className={`p-1.5 rounded-lg border transition-colors ${
                                isDark ? "bg-slate-800 text-slate-400 hover:text-white border-slate-700" : "bg-white text-slate-600 hover:text-slate-900 border-slate-200"
                            }`}
                        >
                            {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            title="Close Copilot"
                            className={`p-1.5 rounded-lg border transition-colors ${
                                isDark ? "bg-slate-800 text-slate-400 hover:text-white border-slate-700" : "bg-white text-slate-600 hover:text-slate-900 border-slate-200"
                            }`}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Message Body (When Not Minimized) */}
                {!isMinimized && (
                    <>
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs sm:text-sm">
                            {messages.map((msg, idx) => {
                                const isUser = msg.role === "user";
                                const hasFeedback = feedbackState[idx];

                                return (
                                    <div key={idx} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                                        {!isUser && (
                                            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                                                <Bot size={14} />
                                            </div>
                                        )}

                                        <div
                                            className={`max-w-[88%] rounded-xl p-3.5 space-y-2.5 ${
                                                isUser
                                                    ? "bg-blue-600 text-white rounded-tr-none shadow-sm font-medium"
                                                    : `${bubbleStyle} rounded-tl-none`
                                            }`}
                                        >
                                            {/* Rich Formatted Markdown Content */}
                                            {isUser ? (
                                                <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs sm:text-sm">
                                                    {msg.content}
                                                </div>
                                            ) : (
                                                <FormattedMessageContent content={msg.content} isDark={isDark} />
                                            )}

                                            {/* RAG Source Citations */}
                                            {!isUser && msg.sources && msg.sources.length > 0 && (
                                                <div className={`pt-2 border-t space-y-1 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-teal-400" : "text-teal-700"}`}>
                                                        <BookOpen size={10} />
                                                        Grounded GST Statutory Sources
                                                    </span>
                                                    <div className="space-y-1">
                                                        {msg.sources.map((src, sIdx) => (
                                                            <div key={sIdx} className={`p-2 rounded-lg border text-[10px] flex items-center justify-between ${
                                                                isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                                                            }`}>
                                                                <div>
                                                                    <strong className="block">{src.title}</strong>
                                                                    <span className="font-mono text-slate-400">{src.section}</span>
                                                                </div>
                                                                {src.source_url && (
                                                                    <a
                                                                        href={src.source_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-blue-500 hover:text-blue-600 ml-2"
                                                                    >
                                                                        <ExternalLink size={11} />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Evidence Findings */}
                                            {!isUser && msg.evidence && msg.evidence.length > 0 && (
                                                <div className="pt-1 flex flex-wrap gap-1">
                                                    {msg.evidence.map((ev, eIdx) => (
                                                        <span key={eIdx} className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800/60 dark:text-rose-300 text-[10px] font-mono rounded">
                                                            {ev.evidence_id}: {ev.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Feedback */}
                                            {!isUser && (
                                                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                                                    <span>Verified Intelligence</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFeedback(idx, "up")}
                                                            className={`hover:text-emerald-500 transition-colors ${hasFeedback === "up" ? "text-emerald-500 font-bold" : ""}`}
                                                        >
                                                            <ThumbsUp size={11} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFeedback(idx, "down")}
                                                            className={`hover:text-rose-500 transition-colors ${hasFeedback === "down" ? "text-rose-500 font-bold" : ""}`}
                                                        >
                                                            <ThumbsDown size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isUser && (
                                            <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                                                <User size={14} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {loading && (
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 animate-pulse">
                                        <Sparkles size={14} />
                                    </div>
                                    <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${bubbleStyle}`}>
                                        <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-slate-400">Synthesizing telemetry & GST rules...</span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggested Chips */}
                        <div className={`p-2.5 border-t overflow-x-auto no-scrollbar ${
                            isDark ? "border-slate-800 bg-[#090d16]" : "border-slate-100 bg-slate-50/50"
                        }`}>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className={`text-[9px] uppercase font-bold tracking-wider font-mono shrink-0 ${
                                    isDark ? "text-slate-500" : "text-slate-400"
                                }`}>
                                    Suggested:
                                </span>
                                {quickChips.map((chip, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handlePromptChip(chip)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap transition-all border ${
                                            isDark
                                                ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
                                                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm"
                                        }`}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input Box */}
                        <div className={`p-3 border-t ${
                            isDark ? "border-slate-800 bg-[#0e1320]" : "border-slate-100 bg-white"
                        }`}>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSend();
                                }}
                                className="relative flex items-center"
                            >
                                <input
                                    type="text"
                                    placeholder={activeVehicleNumber ? `Ask about vehicle ${activeVehicleNumber}...` : "Ask any GST compliance or vehicle question..."}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={loading}
                                    className={`w-full border rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm outline-none transition-all ${
                                        isDark
                                            ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                                    }`}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || loading}
                                    className="absolute right-1.5 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <Send size={14} />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
