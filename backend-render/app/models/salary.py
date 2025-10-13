from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Salary(Base):
    __tablename__ = "salary"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    month = Column(String(7), nullable=False)  # YYYY-MM format
    year = Column(Integer, nullable=False)
    total_hours = Column(Float, default=0.0)
    regular_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    rate_per_hour = Column(Float, nullable=False)
    overtime_rate = Column(Float, default=0.0)
    gross_salary = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    bonuses = Column(Float, default=0.0)
    net_salary = Column(Float, default=0.0)
    status = Column(String(20), default="pending")  # pending, approved, paid
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="salary_records")
    processor = relationship("User", foreign_keys=[processed_by])
    
    def __repr__(self):
        return f"<Salary(id={self.id}, employee_id={self.employee_id}, month='{self.month}')>"
