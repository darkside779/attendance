from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)  # Link to assigned shift
    check_in = Column(DateTime(timezone=True), nullable=False)
    check_out = Column(DateTime(timezone=True), nullable=True)
    total_hours = Column(Float, default=0.0)
    break_time = Column(Float, default=0.0)  # Break time in hours
    overtime_hours = Column(Float, default=0.0)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD format
    status = Column(String(20), default="present")  # present, absent, late, half_day
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="attendance_records")
    shift = relationship("Shift")
    modifications = relationship("AttendanceModification", back_populates="attendance")
    
    def __repr__(self):
        return f"<Attendance(id={self.id}, employee_id={self.employee_id}, date='{self.date}')>"
