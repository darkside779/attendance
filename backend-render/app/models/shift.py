from sqlalchemy import Column, Integer, String, DateTime, Time, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Shift(Base):
    __tablename__ = "shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)  # NULL for templates
    shift_name = Column(String(50), nullable=False)  # Morning, Evening, Night, etc.
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    days_of_week = Column(Text, nullable=False)  # JSON string: ["monday", "tuesday", ...]
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="shifts")
    
    def __repr__(self):
        return f"<Shift(id={self.id}, employee_id={self.employee_id}, shift_name='{self.shift_name}')>"
