import json
import re
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.ai_chat import AIChatSession, AIChatMessage
from app.models.user import User
from app.models.vehicle_analysis import VehicleAnalysisRecord
from app.models.eway_bill import EwayBill
from app.core.vehicle import normalize_vehicle_number
from app.services.ai.llm_service import LLMService
from app.services.ai.rag_service import RAGService
from app.services.ai.tool_service import RiskToolService
from app.services.ai.prompt_service import PromptService
from app.services.ai.guardrails_service import CopilotGuardrails
from app.core.logging_config import logger


class CopilotService:
    """
    AI Risk Copilot Orchestration Service.
    Coordinates Intent Routing, Tool Calling, RAG Retrieval, and Conversational Sessions.
    """

    @classmethod
    def detect_intent(cls, message: str, vehicle_number: Optional[str] = None) -> str:
        msg = message.lower().strip()
        clean = re.sub(r"[^\w\s]", " ", msg)
        tokens = set(clean.split())

        has_vehicle = bool(vehicle_number) or bool(re.search(r"\b(?!(?:rule|page|sect|code|item)\b)[a-z]{2}[-\s]?\d{1,2}[-\s]?[a-z0-9]{3,8}\b", msg))

        # 1. If a vehicle is specified, prioritize vehicle intelligence
        if has_vehicle:
            if any(term in msg for term in ["rule 138", "validity period", "cgst rule", "penalty under", "section 129", "section 122"]):
                return "MIXED"
            if any(term in msg for term in ["speed", "fastag", "toll", "movement", "jump", "teleport", "velocity"]):
                return "VEHICLE_EVIDENCE"
            if any(term in msg for term in ["route", "bearing", "direction", "destination", "deviation"]):
                return "VEHICLE_ROUTE"
            if any(term in msg for term in ["investigate", "action", "check", "recommend", "audit"]):
                return "VEHICLE_INVESTIGATION"
            return "VEHICLE_RISK"

        # 2. Flexible Greetings & Conversational check
        greeting_phrases = [
            "hi", "hello", "hey", "what?", "what", "who are you", "what are you",
            "help", "good morning", "good evening", "namaste", "yo", "sup",
            "how are you", "what can you do", "how does this work"
        ]
        if msg in greeting_phrases or any(msg.startswith(p + " ") for p in ["hi", "hello", "hey"]):
            return "GREETING"

        # 3. Flexible Fleet Overview & Vehicle Count Queries (handles typos like 'oif', 'numbre')
        fleet_phrases = [
            "total car", "total vehicle", "all vehicles", "all cars", "list vehicles", "list cars",
            "how many vehicles", "how many cars", "fleet details", "fleet status", "show cars",
            "show vehicles", "details present", "car details", "vehicle details", "cars available",
            "vehicles available", "number of cars", "number of vehicles", "total number", "monitored fleet",
            "available cars", "available vehicles"
        ]
        if any(p in clean for p in fleet_phrases):
            return "FLEET_OVERVIEW"

        veh_words = {"car", "cars", "vehicle", "vehicles", "fleet", "truck", "trucks", "plates", "records"}
        count_words = {"total", "count", "number", "numbers", "many", "all", "available", "present", "list", "summary", "status", "overview", "show", "how", "what", "exist", "indexed", "registered"}
        if (tokens & veh_words) and (tokens & count_words):
            return "FLEET_OVERVIEW"

        if ("total" in tokens or "many" in tokens or "available" in tokens) and any(w.startswith(("veh", "car", "truc")) for w in tokens):
            return "FLEET_OVERVIEW"

        if any(term in msg for term in ["rule 138", "what is e-way", "what is an e-way", "validity period", "cgst rule", "penalty under", "section 129", "section 122"]):
            return "GENERAL_GST"

        return "GENERAL_GST"

    @classmethod
    async def process_chat_message(
        cls,
        db: Session,
        user: User,
        message: str,
        vehicle_number: Optional[str] = None,
        session_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        # 1. Input Guardrails
        is_safe, clean_msg, rejection_reason = CopilotGuardrails.validate_input(message)
        if not is_safe:
            return {
                "session_id": session_id or 0,
                "answer": f"**Security Notice:** {rejection_reason}",
                "sources": [],
                "vehicle_context": vehicle_number,
                "evidence_references": [],
                "confidence": "HIGH",
                "tool_usage": ["Guardrails.validate_input"],
            }

        norm_v = normalize_vehicle_number(vehicle_number) if vehicle_number else None

        # Check for vehicle number embedded in text if not explicitly provided
        if not norm_v:
            v_match = re.search(r"\b(?!(?:rule|page|sect|code|item|part)\b)([a-zA-Z]{2}\s*\d{1,2}\s*[a-zA-Z0-9]{3,8})\b", clean_msg, re.IGNORECASE)
            if v_match:
                candidate = v_match.group(1).replace(" ", "").upper()
                if not candidate.startswith(("RULE", "SECT", "PAGE", "ITEM", "CODE")):
                    norm_v = normalize_vehicle_number(candidate)

        # 2. Manage Chat Session in SQL
        chat_session = None
        if session_id:
            chat_session = db.query(AIChatSession).filter(
                AIChatSession.id == session_id,
                AIChatSession.user_id == user.id
            ).first()

        if not chat_session:
            title = f"Investigation: {norm_v}" if norm_v else f"Query: {clean_msg[:30]}..."
            chat_session = AIChatSession(
                user_id=user.id,
                vehicle_number=norm_v,
                title=title
            )
            db.add(chat_session)
            db.commit()
            db.refresh(chat_session)
        elif norm_v and not chat_session.vehicle_number:
            chat_session.vehicle_number = norm_v
            db.commit()

        # 3. Intent Routing
        intent = cls.detect_intent(clean_msg, norm_v)
        logger.info(f"Copilot intent detected: {intent} (vehicle={norm_v}, session={chat_session.id})")

        context_data = None
        tool_usage = []
        evidence_references = []
        rag_sources = []

        # Case A: Casual Greetings
        if intent == "GREETING":
            total_records = db.query(VehicleAnalysisRecord).count()
            high_count = db.query(VehicleAnalysisRecord).filter(VehicleAnalysisRecord.risk_level == "HIGH").count()
            answer = (
                "Hello Inspector. I am the **GST Risk Copilot**.\n\n"
                f"I am actively monitoring **{total_records} commercial transport vehicles** across nationwide logistics corridors, with **{high_count} high-risk alerts** currently flagged for review.\n\n"
                "I can assist you with:\n"
                "- **Auditing specific vehicles:** (e.g. *\"Audit vehicle MH04HR1001\"* or *\"DL01XY9876\"*)\n"
                "- **Fleet statistics:** (e.g. *\"Total number of cars available?\"*)\n"
                "- **Statutory provisions:** (e.g. *\"What is Rule 138 validity?\"* or *\"Section 129 penalties\"*)\n"
                "- **Telemetry checks:** (e.g. *\"Check impossible speeds or ghost transits\"*)"
            )

        # Case B: Fleet Overview / Total Cars
        elif intent == "FLEET_OVERVIEW":
            tool_usage.append("Database.get_fleet_summary")
            total_records = db.query(VehicleAnalysisRecord).count()
            high_count = db.query(VehicleAnalysisRecord).filter(VehicleAnalysisRecord.risk_level == "HIGH").count()
            med_count = db.query(VehicleAnalysisRecord).filter(VehicleAnalysisRecord.risk_level == "MEDIUM").count()
            low_count = db.query(VehicleAnalysisRecord).filter(VehicleAnalysisRecord.risk_level == "LOW").count()

            high_vehicles = [
                r[0] for r in db.query(VehicleAnalysisRecord.vehicle_number)
                .filter(VehicleAnalysisRecord.risk_level == "HIGH")
                .limit(5).all()
            ]

            sample_str = ", ".join([f"`{v}`" for v in high_vehicles]) if high_vehicles else "`MH04HR1001`, `DL01XY9876`"

            answer = (
                f"### Monitored Fleet Surveillance Summary\n\n"
                f"There are currently **{total_records} transport vehicles** actively indexed in the surveillance registry:\n\n"
                f"- **High Risk / Urgent Review:** **{high_count} vehicles**\n"
                f"  - Flagged for multiple statutory violations including impossible speeds (>300 km/h), duplicate concurrent manifests, and expired E-Way Bills.\n"
                f"  - Priority targets: {sample_str}\n\n"
                f"- **Medium Risk:** **{med_count} vehicles** (Telemetry deviations or borderline transit speeds)\n"
                f"- **Low Risk / Compliant:** **{low_count} vehicles** (Operating within statutory limits)\n\n"
                f"To review any vehicle in detail, ask: *\"Audit vehicle {high_vehicles[0] if high_vehicles else 'MH04HR1001'}\"*."
            )

        # Case C: Specific Vehicle Context
        elif norm_v:
            tool_usage.append("RiskToolService.get_vehicle_risk_profile")
            prof = await RiskToolService.get_vehicle_risk_profile(db, norm_v)
            ev = await RiskToolService.get_vehicle_evidence(db, norm_v)
            rules = await RiskToolService.get_vehicle_rules(db, norm_v)
            decision = await RiskToolService.get_investigation_recommendations(db, norm_v)

            if prof:
                context_data = {
                    "profile": prof,
                    "evidence": ev or [],
                    "rules": rules or [],
                    "decision": decision or {},
                }
                evidence_references = [
                    {"evidence_id": e.get("evidence_id"), "title": e.get("title"), "category": e.get("category")}
                    for e in (ev or [])
                ]

            if intent in ["MIXED"]:
                rag_sources = RAGService.retrieve_context(clean_msg, top_k=2)

            answer = LLMService.generate_response(
                system_prompt=PromptService.SYSTEM_PROMPT,
                user_message=clean_msg,
                context_data=context_data,
                rag_sources=rag_sources,
            )

        # Case D: General Regulatory or Interactive Inquiries
        else:
            rag_sources = RAGService.retrieve_context(clean_msg, top_k=2)
            answer = LLMService.generate_response(
                system_prompt=PromptService.SYSTEM_PROMPT,
                user_message=clean_msg,
                context_data=None,
                rag_sources=rag_sources,
            )

        # Save message history
        user_msg_entry = AIChatMessage(
            session_id=chat_session.id,
            role="user",
            content=clean_msg,
        )
        asst_msg_entry = AIChatMessage(
            session_id=chat_session.id,
            role="assistant",
            content=answer,
            sources_json=json.dumps(rag_sources),
            evidence_json=json.dumps(evidence_references),
            tool_calls_json=json.dumps(tool_usage),
        )
        db.add_all([user_msg_entry, asst_msg_entry])
        db.commit()

        formatted_sources = [
            {
                "doc_id": s.get("doc_id"),
                "title": s.get("title"),
                "section": s.get("section") or s.get("reference") or "Rule 138",
                "source_url": s.get("source_url"),
            }
            for s in rag_sources
        ]

        return {
            "session_id": chat_session.id,
            "answer": answer,
            "sources": formatted_sources,
            "vehicle_context": norm_v,
            "evidence_references": evidence_references,
            "confidence": context_data.get("profile", {}).get("confidence_level", "HIGH") if context_data else "HIGH",
            "tool_usage": tool_usage,
        }
