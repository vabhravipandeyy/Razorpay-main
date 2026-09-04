import os
import json
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional
from app.core.logging_config import logger
from app.services.ai.guardrails_service import CopilotGuardrails


class LLMService:
    """
    Provider-Agnostic LLM Service with Guardrails.
    Supports Grok (xAI), Google Gemini, OpenAI, and Grounded Deterministic Fallback.
    """

    @classmethod
    def get_provider(cls) -> str:
        prov = os.getenv("LLM_PROVIDER", "").lower()
        if prov:
            return prov
        if os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY"):
            return "grok"
        if os.getenv("GEMINI_API_KEY"):
            return "gemini"
        if os.getenv("OPENAI_API_KEY"):
            return "openai"
        return "deterministic"

    @classmethod
    def generate_response(
        cls,
        system_prompt: str,
        user_message: str,
        context_data: Optional[Dict[str, Any]] = None,
        rag_sources: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        provider = cls.get_provider()
        grok_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY") or (os.getenv("LLM_API_KEY") if provider == "gemini" else None)
        openai_key = os.getenv("OPENAI_API_KEY") or (os.getenv("LLM_API_KEY") if provider == "openai" else None)

        raw_response = ""

        # 1. Grok (xAI) Provider
        if (provider == "grok" or grok_key) and grok_key:
            try:
                raw_response = cls._call_grok(grok_key, system_prompt, user_message, context_data, rag_sources)
            except Exception as e:
                logger.warning(f"Grok (xAI) API call failed, attempting fallback: {e}")

        # 2. Gemini Provider
        if not raw_response and provider == "gemini" and gemini_key:
            try:
                raw_response = cls._call_gemini(gemini_key, system_prompt, user_message, context_data, rag_sources)
            except Exception as e:
                logger.warning(f"Gemini API call failed, attempting fallback: {e}")

        # 3. OpenAI Provider
        if not raw_response and provider == "openai" and openai_key:
            try:
                raw_response = cls._call_openai(openai_key, system_prompt, user_message, context_data, rag_sources)
            except Exception as e:
                logger.warning(f"OpenAI API call failed, attempting fallback: {e}")

        # 4. Default: Grounded Deterministic Intelligence Engine
        if not raw_response:
            raw_response = cls._synthesize_grounded_response(user_message, context_data, rag_sources)

        # Apply Output Guardrails (Strip emojis, sanitize tokens, enforce clean layout)
        return CopilotGuardrails.sanitize_output(raw_response)

    @classmethod
    def _call_grok(
        cls,
        api_key: str,
        system_prompt: str,
        user_message: str,
        context_data: Optional[Dict[str, Any]],
        rag_sources: Optional[List[Dict[str, Any]]]
    ) -> str:
        model = os.getenv("GROK_MODEL", os.getenv("LLM_MODEL", "grok-2-latest"))
        url = "https://api.x.ai/v1/chat/completions"

        context_str = ""
        if context_data:
            context_str += f"\n\nVERIFIED VEHICLE CONTEXT:\n{json.dumps(context_data, indent=2)}"
        if rag_sources:
            context_str += f"\n\nRETRIEVED GST REGULATORY SOURCES:\n{json.dumps(rag_sources, indent=2)}"

        payload = json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt + context_str},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.2
        }).encode("utf-8")

        req = urllib.request.Request(url, data=payload, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        })
        with urllib.request.urlopen(req, timeout=12) as response:
            res = json.loads(response.read().decode())
            return res["choices"][0]["message"]["content"]

    @classmethod
    def _call_gemini(
        cls,
        api_key: str,
        system_prompt: str,
        user_message: str,
        context_data: Optional[Dict[str, Any]],
        rag_sources: Optional[List[Dict[str, Any]]]
    ) -> str:
        model = os.getenv("LLM_MODEL", "gemini-1.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        full_prompt = f"{system_prompt}\n\n"
        if context_data:
            full_prompt += f"VERIFIED VEHICLE CONTEXT:\n{json.dumps(context_data, indent=2)}\n\n"
        if rag_sources:
            full_prompt += f"RETRIEVED GST REGULATORY SOURCES:\n{json.dumps(rag_sources, indent=2)}\n\n"
        full_prompt += f"USER QUERY: {user_message}"

        payload = json.dumps({"contents": [{"parts": [{"text": full_prompt}]}]}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=12) as response:
            res = json.loads(response.read().decode())
            return res["candidates"][0]["content"]["parts"][0]["text"]

    @classmethod
    def _call_openai(
        cls,
        api_key: str,
        system_prompt: str,
        user_message: str,
        context_data: Optional[Dict[str, Any]],
        rag_sources: Optional[List[Dict[str, Any]]]
    ) -> str:
        model = os.getenv("LLM_MODEL", "gpt-4o-mini")
        url = "https://api.openai.com/v1/chat/completions"

        context_str = ""
        if context_data:
            context_str += f"\n\nVERIFIED VEHICLE CONTEXT:\n{json.dumps(context_data, indent=2)}"
        if rag_sources:
            context_str += f"\n\nRETRIEVED GST REGULATORY SOURCES:\n{json.dumps(rag_sources, indent=2)}"

        payload = json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt + context_str},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.2
        }).encode("utf-8")

        req = urllib.request.Request(url, data=payload, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        })
        with urllib.request.urlopen(req, timeout=12) as response:
            res = json.loads(response.read().decode())
            return res["choices"][0]["message"]["content"]

    @classmethod
    def _synthesize_grounded_response(
        cls,
        user_message: str,
        context_data: Optional[Dict[str, Any]] = None,
        rag_sources: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """
        Prompt-Specific Grounded Synthesis.
        Directly answers the user's specific query without generic boilerplate.
        """
        msg = user_message.lower()

        # =========================================================================
        # 1. SPECIFIC VEHICLE QUERY CONTEXT
        # =========================================================================
        if context_data and "profile" in context_data:
            prof = context_data["profile"]
            v_num = prof.get("vehicle_number", "TARGET_VEHICLE")
            risk_score = prof.get("risk_score", 0)
            risk_level = prof.get("risk_level", "LOW")
            confidence = prof.get("confidence_level", "HIGH")
            compliance = prof.get("compliance_score", 100)
            trust = prof.get("trust_score", 100)
            ml_anomaly = prof.get("ml_anomaly_score", 0)
            hybrid_score = prof.get("hybrid_risk_score", risk_score)
            evidence_list = context_data.get("evidence", [])
            decision = context_data.get("decision", {})

            # Sub-case A: Speed / FASTag Telemetry
            if any(term in msg for term in ["speed", "fastag", "toll", "movement", "jump", "teleport"]):
                lines = [f"### FASTag Telemetry & Kinematic Speed Analysis: `{v_num}`", ""]
                speed_ev = [e for e in evidence_list if "speed" in e.get("title", "").lower() or "speed" in e.get("description", "").lower()]
                if speed_ev:
                    lines.append("**Flagged Speed Anomalies:**")
                    for ev in speed_ev:
                        lines.append(f"- **[{ev.get('severity', 'HIGH')}] {ev.get('title')}:** {ev.get('description')}")
                else:
                    lines.append(f"No impossible speed jumps (>85 km/h) detected across recorded FASTag passages. Kinematic sanity score is **{trust}/100%**.")
                lines.append("")
                lines.append(f"**Physical Movement Trust:** {trust}/100% | **Confidence:** `{confidence}`")
                return "\n".join(lines)

            # Sub-case B: Route / Bearing Mismatch
            if any(term in msg for term in ["route", "bearing", "direction", "corridor", "pin"]):
                lines = [f"### Route Vector Alignment & Origin-Destination Analysis: `{v_num}`", ""]
                route_ev = [e for e in evidence_list if "route" in e.get("title", "").lower() or "bearing" in e.get("title", "").lower() or "direction" in e.get("description", "").lower()]
                if route_ev:
                    lines.append("**Route Integrity Findings:**")
                    for ev in route_ev:
                        lines.append(f"- **[{ev.get('severity', 'HIGH')}] {ev.get('title')}:** {ev.get('description')}")
                else:
                    lines.append(f"FASTag toll corridors match declared E-Way Bill transit vectors. Route alignment index is **{compliance}/100%**.")
                return "\n".join(lines)

            # Sub-case C: Recommended Actions / Next Steps
            if any(term in msg for term in ["investigate", "action", "recommend", "next", "check", "step"]):
                lines = [f"### Recommended Investigative Actions: `{v_num}`", ""]
                recs = decision.get("action_items", [])
                if recs:
                    for idx, r in enumerate(recs, 1):
                        lines.append(f"{idx}. {r}")
                else:
                    lines.append("1. Verify physical consignment invoice with transporter manifest.")
                    lines.append("2. Confirm driver logbook against NHAI RFID toll sequence.")
                    lines.append("3. Verify GSTIN registration status of consignor and consignee.")
                return "\n".join(lines)

            # Sub-case D: General / High Risk inquiry for this vehicle
            lines = [f"### Vehicle Risk Profile: `{v_num}`", ""]
            lines.append(f"**Assessed Threat Level:** `{risk_level} RISK` ({hybrid_score}/100 Hybrid Score)")
            lines.append(f"- **Statutory Risk Score:** {risk_score}/130 pts")
            lines.append(f"- **ML Anomaly Score:** {ml_anomaly}/100 pts")
            lines.append(f"- **Compliance Score:** {compliance}/100% | **Kinematic Trust:** {trust}/100%")
            lines.append(f"- **Evidence Confidence:** `{confidence}`")
            lines.append("")

            if evidence_list:
                lines.append("#### Key Risk Findings:")
                for ev in evidence_list[:4]:
                    sev = ev.get("severity", "MEDIUM")
                    title = ev.get("title", "Telemetry anomaly")
                    desc = ev.get("description", "")
                    lines.append(f"- **[{sev}] {title}:** {desc}")

            return "\n".join(lines)

        # =========================================================================
        # 2. SPECIFIC REGULATORY RAG INQUIRY
        # =========================================================================
        # Prompt specific match: What is an E-Way Bill / Rule 138
        if "what is an e-way" in msg or "what is e-way" in msg or "rule 138" in msg:
            return (
                "### Understanding E-Way Bill under CGST Rule 138\n\n"
                "An **Electronic Way Bill (E-Way Bill)** is a mandatory statutory document generated on the common GST portal (`ewaybillgst.gov.in`) for the movement of goods:\n\n"
                "- **Monetary Threshold:** Mandatory whenever the consignment value of goods exceeds **₹50,000** (for inter-state or intra-state transit).\n"
                "- **Two-Part Structure:**\n"
                "  - **Part A:** Contains GSTIN of supplier & recipient, place of delivery (PIN code), invoice/challan number, date, value of goods, and HSN code.\n"
                "  - **Part B:** Contains transporter details and commercial vehicle registration number.\n"
                "- **Integration with FASTag:** Rule 138A mandates integration with NHAI RFID FASTag sensors at highway toll plazas to track live conveyance movement and prevent duplicate document recycling.\n"
                "- **Enforcement Action:** Transit without a valid E-Way Bill or Part-B vehicle assignment attracts detention and penalties under **Section 129 of the CGST Act**."
            )

        # Prompt specific match: Validity period
        if "validity" in msg or "period" in msg or "500 km" in msg or "200 km" in msg:
            return (
                "### E-Way Bill Validity Standards under Rule 138(10)\n\n"
                "Under **CGST Rule 138(10)**, the validity of an E-Way Bill is determined strictly by the distance between the origin and destination PIN codes:\n\n"
                "- **Standard Commercial Cargo:**\n"
                "  - **Up to 200 km:** 1 Day (24 hours).\n"
                "  - **Every additional 200 km (or part thereof):** 1 Additional Day.\n"
                "  - *Example:* For a travel distance of **500 km**, the validity is **3 Days** (200 km + 200 km + 100 km).\n"
                "- **Over Dimensional Cargo (ODC) / Multimodal Ship:**\n"
                "  - **Up to 20 km:** 1 Day.\n"
                "  - **Every additional 20 km (or part thereof):** 1 Additional Day.\n"
                "- **Expiry Rule:** Validity expires at midnight of the last day. Moving goods beyond validity without formal portal extension constitutes unauthorized transit under Section 129."
            )

        # Prompt specific match: No FASTag scans / Ghost transits
        if "no fastag" in msg or "no toll" in msg or "ghost" in msg:
            return (
                "### Detection of Ghost Transits & Missing FASTag Scans\n\n"
                "When an E-Way Bill is generated for a transit route spanning highway corridors (e.g., >100 km) but **zero FASTag RFID scans** are recorded during the validity window:\n\n"
                "- **Risk Typology (Ghost Invoicing):** Represents bill trading or circular invoice recycling where invoices and E-Way Bills are generated solely to claim fraudulent Input Tax Credit (ITC) without actual physical movement of goods.\n"
                "- **Enforcement Procedure:** Officers trigger Section 122 penalty notices and verify consignor warehouse dispatch logs and weighbridge records."
            )

        # Prompt specific match: Duplicate invoices / recycling
        if "duplicate" in msg or "recycling" in msg or "multiple" in msg:
            return (
                "### Duplicate Invoice Recycling & Multiple EWB Violations\n\n"
                "Under **Section 122 & Section 129 of the CGST Act**:\n\n"
                "- **Violation:** Generating multiple concurrent E-Way Bills on the same vehicle for overlapping routes, or reusing the same bill for multiple trips.\n"
                "- **Penalties:** Mandatory penalty equal to 200% of the tax payable (or ₹25,000 whichever is higher) under Section 129(1)(a), along with potential seizure of goods and conveyance under Section 130."
            )

        # Fallback RAG search
        if rag_sources and len(rag_sources) > 0:
            top_src = rag_sources[0]
            lines = [f"### GST Regulatory Provision: {top_src.get('title')}", ""]
            lines.append(f"**Statutory Reference:** `{top_src.get('reference')}`")
            lines.append("")
            lines.append(top_src.get("content", ""))
            return "\n".join(lines)

        return (
            "I am the **GST Risk Copilot**. I can provide factual investigation briefs, "
            "explain statutory GST rules, evaluate FASTag speed anomalies, and verify E-Way Bill validity periods. "
            "Please specify a commercial vehicle registration number (e.g., `KA01AB1234`) or ask a specific GST compliance question."
        )
