from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

class NoteStatCreate(BaseModel):
    note: str
    frequency: Optional[float] = None
    cents_deviation: Optional[float] = None
    accuracy: Optional[float] = None
    timestamp_ms: Optional[int] = None

class LowAccuracyEventCreate(BaseModel):
    note: Optional[str] = None
    frequency: Optional[float] = None
    cents_deviation: Optional[float] = None
    accuracy: Optional[float] = None
    timestamp_ms: Optional[int] = None

class AudioAnalysisSessionCreate(BaseModel):
    source_type: str = 'microphone'
    source_name: Optional[str] = 'Live Recording'
    total_events: Optional[int] = None
    average_event_accuracy: Optional[float] = None
    session_metadata: Optional[Dict[str, Any]] = None
    note_stats: List[NoteStatCreate]
    low_accuracy_events: List[LowAccuracyEventCreate] = []
    user_id: Optional[str] = None  # Optional, will be set from auth if not provided

class AudioAnalysisSessionResponse(BaseModel):
    id: int
    user_id: Optional[str]
    created_at: datetime
    source_type: str
    source_name: Optional[str]
    sync_status: str
    total_events: Optional[int]
    average_event_accuracy: Optional[float]
    session_metadata: Optional[Dict[str, Any]]
    audio_file_s3_key: Optional[str]
    
    class Config:
        from_attributes = True

