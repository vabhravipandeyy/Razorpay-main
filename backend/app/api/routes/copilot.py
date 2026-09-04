import json
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import UserResponse
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.ai_chat import AIChatSession, AIChatMessage
from app.services.ai.copilot_service import CopilotService
from app.services.ai.llm_service import LLMService
from app.services.ai.rag_service import RAGService
from app.core.logging_config import logger

router = APIRouter(
    prefix="/api/copilot",
    tags=["AI Copilot"]
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User investigation query")
    vehicle_number: Optional[str] = Field(None, description="Active vehicle registration context")
    session_id: Optional[int] = Field(None, description="Existing chat session ID")


@router.post("/chat")
async def chat_with_copilot(
    payload: ChatRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Interact conversationally with the AI Risk Copilot.
    Processes vehicle risk queries via controlled tools and regulatory queries via RAG.
    """
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

        result = await CopilotService.process_chat_message(
            db=db,
            user=user,
            message=payload.message,
            vehicle_number=payload.vehicle_number,
            session_id=payload.session_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Copilot chat interaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI Copilot service encountered an unexpected error."
        )


@router.get("/sessions")
def get_user_chat_sessions(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List recent AI Copilot chat sessions for the authenticated user."""
    sessions = db.query(AIChatSession).filter(
        AIChatSession.user_id == current_user.id
    ).order_by(AIChatSession.updated_at.desc()).limit(20).all()

    return [
        {
            "id": s.id,
            "vehicle_number": s.vehicle_number,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
def get_session_history(
    session_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve message history for a specific chat session."""
    session_obj = db.query(AIChatSession).filter(
        AIChatSession.id == session_id,
        AIChatSession.user_id == current_user.id
    ).first()

    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or unauthorized."
        )

    messages = db.query(AIChatMessage).filter(
        AIChatMessage.session_id == session_id
    ).order_by(AIChatMessage.created_at.asc()).all()

    items = []
    for m in messages:
        sources = []
        evidence = []
        if m.sources_json:
            try:
                sources = json.loads(m.sources_json)
            except Exception:
                pass
        if m.evidence_json:
            try:
                evidence = json.loads(m.evidence_json)
            except Exception:
                pass

        items.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sources": sources,
            "evidence": evidence,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    return {
        "session_id": session_obj.id,
        "vehicle_number": session_obj.vehicle_number,
        "title": session_obj.title,
        "messages": items
    }


@router.get("/health")
def get_copilot_health(
    current_user: UserResponse = Depends(get_current_user)
):
    """Health check for AI Copilot, LLM engine, and Vector Store."""
    store = RAGService.get_vector_store()
    return {
        "status": "ONLINE",
        "llm_provider": LLMService.get_provider(),
        "vector_store_documents": len(store.documents) if store else 0,
        "knowledge_base_ready": bool(store and store.documents),
    }
