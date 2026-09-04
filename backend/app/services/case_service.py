import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.investigation import InvestigationCase, InvestigationNote, CaseEvidenceReview
from app.models.user import User
from app.core.vehicle import normalize_vehicle_number
from app.services.analysis_service import AnalysisService
from app.services.audit_service import AuditService
from app.core.logging_config import logger


class CaseService:
    """
    Case Management & Investigation Workflow Service (Phase 7).
    Manages investigation lifecycle, evidence review dossiers, notes, and audit traceability.
    """

    VALID_STATUS_TRANSITIONS = {
        "NEW": {"UNDER_REVIEW", "INVESTIGATION"},
        "UNDER_REVIEW": {"INVESTIGATION", "RESOLVED", "NEW"},
        "INVESTIGATION": {"RESOLVED", "UNDER_REVIEW"},
        "RESOLVED": {"CLOSED", "INVESTIGATION"},
        "CLOSED": {"UNDER_REVIEW"},  # Admin reopen only
    }

    VALID_RESOLUTIONS = {
        "NO_ISSUE_FOUND",
        "DATA_ERROR",
        "COMPLIANCE_ISSUE",
        "SUSPICIOUS_ACTIVITY_CONFIRMED",
        "REFERRED_FOR_FURTHER_REVIEW",
        "OTHER",
    }

    @classmethod
    def generate_case_number(cls, db: Session) -> str:
        """Generate unique human-readable case number: GST-YYYY-NNNNNN"""
        current_year = datetime.now(timezone.utc).year
        year_prefix = f"GST-{current_year}-"
        count = db.query(InvestigationCase).filter(InvestigationCase.case_number.like(f"{year_prefix}%")).count()
        return f"{year_prefix}{count + 1:06d}"

    @classmethod
    async def create_investigation_case(
        cls,
        db: Session,
        vehicle_number: str,
        user: User,
        title: Optional[str] = None,
        description: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[InvestigationCase, bool]:
        """
        Create a new formal investigation case from verified risk intelligence.
        Prevents duplicate active investigations.
        Returns: (InvestigationCase, is_newly_created)
        """
        norm_v = normalize_vehicle_number(vehicle_number)
        if not norm_v:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid vehicle registration required.")

        # Check for existing active investigation
        active_case = db.query(InvestigationCase).filter(
            InvestigationCase.vehicle_number == norm_v,
            InvestigationCase.status.in_(["NEW", "UNDER_REVIEW", "INVESTIGATION"])
        ).first()

        if active_case:
            logger.info(f"Active case already exists for {norm_v}: {active_case.case_number}")
            return active_case, False

        # Compute live risk analysis snapshot
        analysis = await AnalysisService.analyze_vehicle(db, norm_v)
        case_no = cls.generate_case_number(db)

        snapshot_data = {
            "fraud_risk": analysis.get("fraud_risk", {}),
            "hybrid_risk": analysis.get("hybrid_risk", {}),
            "ml_analysis": analysis.get("ml_analysis", {}),
            "compliance": analysis.get("compliance", {}),
            "trust": analysis.get("trust", {}),
            "confidence": analysis.get("confidence", {}),
            "decision": analysis.get("decision", {}),
            "risk_drivers": analysis.get("risk_drivers", []),
            "financial_context": analysis.get("financial_context", {}),
            "rules": analysis.get("rules", []),
            "evidence": analysis.get("evidence", []),
            "snapshot_timestamp": datetime.now(timezone.utc).isoformat(),
        }

        fraud_score = analysis.get("fraud_risk", {}).get("score", analysis.get("risk_score", 0))
        risk_level = analysis.get("fraud_risk", {}).get("level", analysis.get("risk_level", "LOW"))
        priority = analysis.get("decision", {}).get("priority", "NORMAL")

        new_case = InvestigationCase(
            case_number=case_no,
            vehicle_number=norm_v,
            created_by=user.id,
            assigned_to=user.id if user.role == "inspector" else None,
            risk_score=fraud_score,
            risk_level=risk_level,
            investigation_priority=priority,
            snapshot_json=json.dumps(snapshot_data),
            status="NEW",
            title=title or f"Investigation into {norm_v} ({priority} Priority)",
            description=description or f"Automated investigation docket created following {priority} risk classification ({fraud_score}/100 score).",
        )

        db.add(new_case)
        db.commit()
        db.refresh(new_case)

        AuditService.log_event(
            db=db,
            action="CASE_CREATED",
            user_id=user.id,
            username=user.username,
            resource_type="CASE",
            resource_id=new_case.case_number,
            status="SUCCESS",
            ip_address=ip_address,
            metadata={"vehicle_number": norm_v, "priority": priority, "risk_score": fraud_score}
        )

        return new_case, True

    @classmethod
    def get_cases(
        cls,
        db: Session,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        assigned_to_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        query = db.query(InvestigationCase)

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                (InvestigationCase.case_number.ilike(s)) |
                (InvestigationCase.vehicle_number.ilike(s)) |
                (InvestigationCase.title.ilike(s))
            )

        if status_filter:
            query = query.filter(InvestigationCase.status == status_filter.upper())

        if priority_filter:
            query = query.filter(InvestigationCase.investigation_priority == priority_filter.upper())

        if assigned_to_id:
            query = query.filter(InvestigationCase.assigned_to == assigned_to_id)

        total = query.count()
        cases = query.order_by(InvestigationCase.updated_at.desc()).offset(offset).limit(limit).all()

        items = []
        for c in cases:
            items.append({
                "id": c.id,
                "case_number": c.case_number,
                "vehicle_number": c.vehicle_number,
                "created_by": c.created_by,
                "creator_name": c.creator.full_name or c.creator.username if c.creator else "System",
                "assigned_to": c.assigned_to,
                "assignee_name": c.assignee.full_name or c.assignee.username if c.assignee else "Unassigned",
                "risk_score": c.risk_score,
                "risk_level": c.risk_level,
                "investigation_priority": c.investigation_priority,
                "status": c.status,
                "title": c.title,
                "notes_count": len(c.notes),
                "evidence_reviews_count": len(c.evidence_reviews),
                "resolution_type": c.resolution_type,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "closed_at": c.closed_at.isoformat() if c.closed_at else None,
            })

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "cases": items
        }

    @classmethod
    def get_case_statistics(cls, db: Session) -> Dict[str, Any]:
        total = db.query(InvestigationCase).count()
        new_count = db.query(InvestigationCase).filter(InvestigationCase.status == "NEW").count()
        under_review = db.query(InvestigationCase).filter(InvestigationCase.status == "UNDER_REVIEW").count()
        investigation = db.query(InvestigationCase).filter(InvestigationCase.status == "INVESTIGATION").count()
        resolved = db.query(InvestigationCase).filter(InvestigationCase.status == "RESOLVED").count()
        closed = db.query(InvestigationCase).filter(InvestigationCase.status == "CLOSED").count()
        urgent = db.query(InvestigationCase).filter(InvestigationCase.investigation_priority.in_(["URGENT", "URGENT_REVIEW"])).count()

        return {
            "total_cases": total,
            "open_cases": new_count + under_review + investigation,
            "new_cases": new_count,
            "under_review": under_review,
            "under_investigation": investigation,
            "resolved_cases": resolved,
            "closed_cases": closed,
            "urgent_cases": urgent,
        }

    @classmethod
    async def get_case_detail(cls, db: Session, case_id: int) -> Dict[str, Any]:
        case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found.")

        # Parse snapshot
        try:
            snapshot = json.loads(case.snapshot_json) if case.snapshot_json else {}
        except Exception:
            snapshot = {}

        # Fetch current live analysis to show delta comparison
        current_analysis = await AnalysisService.analyze_vehicle(db, case.vehicle_number)

        # Format notes
        notes_list = [
            {
                "id": n.id,
                "author_id": n.user_id,
                "author_name": n.author.full_name or n.author.username if n.author else "Inspector",
                "content": n.content,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in case.notes
        ]

        # Format evidence reviews
        reviews_dict = {
            r.evidence_id: {
                "id": r.id,
                "status": r.status,
                "notes": r.notes,
                "reviewer": r.reviewer.full_name or r.reviewer.username if r.reviewer else "Inspector",
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in case.evidence_reviews
        }

        # Historical cases for the same vehicle
        history_cases = db.query(InvestigationCase).filter(
            InvestigationCase.vehicle_number == case.vehicle_number,
            InvestigationCase.id != case.id
        ).order_by(InvestigationCase.created_at.desc()).all()

        history_list = [
            {
                "id": h.id,
                "case_number": h.case_number,
                "status": h.status,
                "risk_level": h.risk_level,
                "priority": h.investigation_priority,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in history_cases
        ]

        return {
            "id": case.id,
            "case_number": case.case_number,
            "vehicle_number": case.vehicle_number,
            "title": case.title,
            "description": case.description,
            "status": case.status,
            "investigation_priority": case.investigation_priority,
            "risk_score": case.risk_score,
            "risk_level": case.risk_level,
            "created_by": case.created_by,
            "creator_name": case.creator.full_name or case.creator.username if case.creator else "System",
            "assigned_to": case.assigned_to,
            "assignee_name": case.assignee.full_name or case.assignee.username if case.assignee else "Unassigned",
            "resolution": {
                "type": case.resolution_type,
                "summary": case.resolution_summary,
                "notes": case.resolution_notes,
                "evidence_ids": case.resolution_evidence_ids.split(",") if case.resolution_evidence_ids else [],
                "closed_at": case.closed_at.isoformat() if case.closed_at else None,
                "closed_by_name": case.closer.full_name or case.closer.username if case.closer else None,
            },
            "snapshot": snapshot,
            "current_risk": {
                "fraud_risk_score": current_analysis.get("fraud_risk", {}).get("score", current_analysis.get("risk_score", 0)),
                "hybrid_risk_score": current_analysis.get("hybrid_risk", {}).get("score", 0),
                "ml_anomaly_score": current_analysis.get("ml_analysis", {}).get("ml_anomaly_score", 0),
                "compliance_score": current_analysis.get("compliance_score", 100),
                "trust_score": current_analysis.get("trust_score", 100),
                "confidence_score": current_analysis.get("confidence_score", 100),
                "priority": current_analysis.get("decision", {}).get("priority", "NORMAL"),
            },
            "evidence_items": snapshot.get("evidence", current_analysis.get("evidence", [])),
            "evidence_reviews": reviews_dict,
            "notes": notes_list,
            "vehicle_case_history": history_list,
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "updated_at": case.updated_at.isoformat() if case.updated_at else None,
        }

    @classmethod
    def update_case_status(
        cls,
        db: Session,
        case_id: int,
        new_status: str,
        user: User,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> InvestigationCase:
        case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

        target_status = new_status.upper()
        allowed = cls.VALID_STATUS_TRANSITIONS.get(case.status, set())

        if target_status not in allowed:
            # Special check: Admin reopen
            if case.status == "CLOSED" and target_status == "UNDER_REVIEW" and user.role == "admin":
                pass
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status transition from '{case.status}' to '{target_status}'. Allowed: {list(allowed)}"
                )

        old_status = case.status
        case.status = target_status
        case.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(case)

        AuditService.log_event(
            db=db,
            action="CASE_STATUS_CHANGED",
            user_id=user.id,
            username=user.username,
            resource_type="CASE",
            resource_id=case.case_number,
            status="SUCCESS",
            ip_address=ip_address,
            metadata={"old_status": old_status, "new_status": target_status, "reason": reason}
        )
        return case

    @classmethod
    def assign_case(
        cls,
        db: Session,
        case_id: int,
        assignee_id: Optional[int],
        user: User,
        ip_address: Optional[str] = None
    ) -> InvestigationCase:
        case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

        assignee_user = None
        if assignee_id:
            assignee_user = db.query(User).filter(User.id == assignee_id).first()
            if not assignee_user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee user not found.")

        case.assigned_to = assignee_id
        case.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(case)

        AuditService.log_event(
            db=db,
            action="CASE_ASSIGNED",
            user_id=user.id,
            username=user.username,
            resource_type="CASE",
            resource_id=case.case_number,
            status="SUCCESS",
            ip_address=ip_address,
            metadata={"assigned_to": assignee_user.username if assignee_user else "Unassigned"}
        )
        return case

    @classmethod
    def add_case_note(
        cls,
        db: Session,
        case_id: int,
        content: str,
        user: User,
        ip_address: Optional[str] = None
    ) -> InvestigationNote:
        case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

        note = InvestigationNote(
            case_id=case_id,
            user_id=user.id,
            content=content.strip(),
        )
        case.updated_at = datetime.now(timezone.utc)
        db.add(note)
        db.commit()
        db.refresh(note)

        AuditService.log_event(
            db=db,
            action="CASE_NOTE_ADDED",
            user_id=user.id,
            username=user.username,
            resource_type="CASE",
            resource_id=case.case_number,
            status="SUCCESS",
            ip_address=ip_address,
        )
        return note

    @classmethod
    def review_case_evidence(
        cls,
        db: Session,
        case_id: int,
        evidence_id: str,
        status_val: str,
        notes: Optional[str],
        user: User,
        ip_address: Optional[str] = None
    ) -> CaseEvidenceReview:
        case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

        existing = db.query(CaseEvidenceReview).filter(
            CaseEvidenceReview.case_id == case_id,
            CaseEvidenceReview.evidence_id == evidence_id
        ).first()

        if existing:
            existing.status = status_val.upper()
            existing.notes = notes
            existing.user_id = user.id
            existing.updated_at = datetime.now(timezone.utc)
            review_obj = existing
        else:
            review_obj = CaseEvidenceReview(
                case_id=case_id,
                user_id=user.id,
                evidence_id=evidence_id,
                status=status_val.upper(),
                notes=notes,
            )
            db.add(review_obj)

        case.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(review_obj)

        AuditService.log_event(
            db=db,
            action="EVIDENCE_REVIEWED",
            user_id=user.id,
            username=user.username,
            resource_type="CASE",
            resource_id=case.case_number,
            status="SUCCESS",
            ip_address=ip_address,
            metadata={"evidence_id": evidence_id, "assessment": status_val}
        )
        return review_obj

    @classmethod
    def resolve_case(
        cls,
        db: Session,
        case_id: int,
        resolution_type: str,
        summary: str,
        notes: Optional[str],
        evidence_ids: Optional[List[str]],
        user: User,
        ip_address: Optional[str] = None
    ) -> InvestigationCase:
        case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

        if resolution_type not in cls.VALID_RESOLUTIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid resolution type. Valid types: {list(cls.VALID_RESOLUTIONS)}"
            )

        case.resolution_type = resolution_type
        case.resolution_summary = summary.strip()
        case.resolution_notes = notes.strip() if notes else None
        case.resolution_evidence_ids = ",".join(evidence_ids) if evidence_ids else None
        case.status = "RESOLVED"
        case.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(case)

        AuditService.log_event(
            db=db,
            action="CASE_RESOLVED",
            user_id=user.id,
            username=user.username,
            resource_type="CASE",
            resource_id=case.case_number,
            status="SUCCESS",
            ip_address=ip_address,
            metadata={"resolution_type": resolution_type}
        )
        return case

    @classmethod
    def close_case(
        cls,
        db: Session,
        case_id: int,
        user: User,
        ip_address: Optional[str] = None
    ) -> InvestigationCase:
        case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

        if not case.resolution_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot close case without completing a formal resolution."
            )

        case.status = "CLOSED"
        case.closed_at = datetime.now(timezone.utc)
        case.closed_by = user.id
        case.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(case)

        AuditService.log_event(
            db=db,
            action="CASE_CLOSED",
            user_id=user.id,
            username=user.username,
            resource_type="CASE",
            resource_id=case.case_number,
            status="SUCCESS",
            ip_address=ip_address,
        )
        return case
