from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, JSON, BigInteger, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class AudioAnalysisSession(Base):
    __tablename__ = "audio_analysis_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=True, index=True)  # Supabase Auth user ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    source_type = Column(String(50), nullable=False)
    source_name = Column(String(255))
    sync_status = Column(String(20), default='pending')
    total_events = Column(Integer)
    average_event_accuracy = Column(Numeric(5, 2))
    session_metadata = Column(JSON)
    audio_file_s3_key = Column(String(500))
    
    # Relationships
    note_stats = relationship("NoteStat", back_populates="session", cascade="all, delete-orphan")
    low_accuracy_events = relationship("LowAccuracyEvent", back_populates="session", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("sync_status IN ('pending', 'synced', 'failed')", name="valid_sync_status"),
    )

class NoteStat(Base):
    __tablename__ = "note_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("audio_analysis_sessions.id", ondelete="CASCADE"), nullable=False)
    note = Column(String(10), nullable=False)
    frequency = Column(Numeric(10, 2))
    cents_deviation = Column(Numeric(8, 2))
    accuracy = Column(Numeric(5, 2))
    timestamp_ms = Column(BigInteger)
    
    # Relationship
    session = relationship("AudioAnalysisSession", back_populates="note_stats")

class LowAccuracyEvent(Base):
    __tablename__ = "low_accuracy_events"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("audio_analysis_sessions.id", ondelete="CASCADE"), nullable=False)
    note = Column(String(10))
    frequency = Column(Numeric(10, 2))
    cents_deviation = Column(Numeric(8, 2))
    accuracy = Column(Numeric(5, 2))
    timestamp_ms = Column(BigInteger)
    
    # Relationship
    session = relationship("AudioAnalysisSession", back_populates="low_accuracy_events")

