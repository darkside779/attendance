from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    face_encoding = Column(LONGTEXT, nullable=True)  # Store face encoding as JSON string
    face_image_path = Column(String(255), nullable=True)
    department = Column(String(50), nullable=True)
    position = Column(String(50), nullable=True)
    hire_date = Column(DateTime(timezone=True), nullable=True)
    salary_rate = Column(Integer, default=0)  # Rate per hour in cents
    is_active = Column(String(10), default="true")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    shifts = relationship("Shift", back_populates="employee")
    attendance_records = relationship("Attendance", back_populates="employee")
    salary_records = relationship("Salary", back_populates="employee")
    
    def __repr__(self):
        return f"<Employee(id={self.id}, employee_id='{self.employee_id}', name='{self.name}')>"
