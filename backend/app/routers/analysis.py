from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.s3_service import s3_service
from app.auth import get_current_user, require_auth
import uuid
from io import BytesIO

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.post("/sessions", response_model=schemas.AudioAnalysisSessionResponse)
async def create_analysis_session(
    session_data: schemas.AudioAnalysisSessionCreate,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user)
):
    """오디오 분석 세션 저장 (로그인한 사용자는 user_id가 자동으로 설정됨)"""
    # 세션 생성
    db_session = models.AudioAnalysisSession(
        user_id=user_id,  # 인증된 사용자의 ID
        source_type=session_data.source_type,
        source_name=session_data.source_name,
        total_events=session_data.total_events,
        average_event_accuracy=session_data.average_event_accuracy,
        session_metadata=session_data.session_metadata,
        sync_status='synced'  # API로 저장되면 바로 synced
    )
    
    db.add(db_session)
    db.flush()  # ID를 얻기 위해
    
    # 노트 통계 저장
    for note_stat in session_data.note_stats:
        db_note = models.NoteStat(
            session_id=db_session.id,
            note=note_stat.note,
            frequency=note_stat.frequency,
            cents_deviation=note_stat.cents_deviation,
            accuracy=note_stat.accuracy,
            timestamp_ms=note_stat.timestamp_ms
        )
        db.add(db_note)
    
    # 낮은 정확도 이벤트 저장
    for event in session_data.low_accuracy_events:
        db_event = models.LowAccuracyEvent(
            session_id=db_session.id,
            note=event.note,
            frequency=event.frequency,
            cents_deviation=event.cents_deviation,
            accuracy=event.accuracy,
            timestamp_ms=event.timestamp_ms
        )
        db.add(db_event)
    
    db.commit()
    db.refresh(db_session)
    
    return db_session

@router.post("/sessions/{session_id}/upload-audio")
async def upload_audio_file(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(require_auth)
):
    """오디오 파일을 S3에 업로드하고 세션에 연결 (로그인 필수)"""
    # 세션 존재 확인 및 소유권 확인
    db_session = db.query(models.AudioAnalysisSession).filter(
        models.AudioAnalysisSession.id == session_id,
        models.AudioAnalysisSession.user_id == user_id
    ).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    
    # S3 키 생성 (사용자별 폴더: "users/{user_id}/sessions/{session_id}/audio_xxx.wav")
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'wav'
    s3_key = f"users/{user_id}/sessions/{session_id}/audio_{uuid.uuid4()}.{file_extension}"
    
    # S3에 업로드
    file_content = await file.read()
    file_obj = BytesIO(file_content)
    
    s3_url = s3_service.upload_fileobj(file_obj, s3_key, file.content_type or 'audio/wav')
    
    if not s3_url:
        raise HTTPException(status_code=500, detail="Failed to upload file to S3")
    
    # 세션에 S3 키 저장
    db_session.audio_file_s3_key = s3_key
    db.commit()
    
    return {"s3_url": s3_url, "s3_key": s3_key}

@router.get("/sessions", response_model=List[schemas.AudioAnalysisSessionResponse])
async def list_sessions(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    user_id: str = Depends(require_auth)
):
    """로그인한 사용자의 분석 세션 목록 조회 (로그인 필수)"""
    sessions = db.query(models.AudioAnalysisSession)\
        .filter(models.AudioAnalysisSession.user_id == user_id)\
        .order_by(models.AudioAnalysisSession.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    return sessions

@router.get("/sessions/{session_id}", response_model=schemas.AudioAnalysisSessionResponse)
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(require_auth)
):
    """특정 세션 상세 조회 (로그인 필수, 본인 세션만)"""
    session = db.query(models.AudioAnalysisSession)\
        .filter(
            models.AudioAnalysisSession.id == session_id,
            models.AudioAnalysisSession.user_id == user_id
        )\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    
    return session

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(require_auth)
):
    """세션 삭제 (로그인 필수, 본인 세션만)"""
    session = db.query(models.AudioAnalysisSession)\
        .filter(
            models.AudioAnalysisSession.id == session_id,
            models.AudioAnalysisSession.user_id == user_id
        )\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    
    # S3에서 오디오 파일 삭제
    if session.audio_file_s3_key:
        s3_service.delete_file(session.audio_file_s3_key)
    
    db.delete(session)
    db.commit()
    
    return {"message": "Session deleted successfully"}
