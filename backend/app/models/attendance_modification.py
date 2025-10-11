from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class AttendanceModification(Base):
    __tablename__ = "attendance_modifications"
    
    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendance.id"), nullable=False)
    modified_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    field_changed = Column(String(50), nullable=False)  # 'check_in', 'check_out', 'status', etc.
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    reason = Column(Text, nullable=False)
    modification_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    attendance = relationship("Attendance", back_populates="modifications")
    modifier = relationship("User", foreign_keys=[modified_by])
    
    def __repr__(self):
        return f"<AttendanceModification(id={self.id}, attendance_id={self.attendance_id}, field='{self.field_changed}')>"
