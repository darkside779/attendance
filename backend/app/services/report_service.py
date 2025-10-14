"""
Report generation service for PDF and Excel exports
"""
import io
import pandas as pd
from datetime import datetime, date, timedelta
from typing import List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.employee import Employee
from app.services.employee_service import EmployeeService

class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.employee_service = EmployeeService(db)

    def get_attendance_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None, 
                          employee_id: Optional[int] = None) -> List[dict]:
        """Get attendance data for reports"""
        query = self.db.query(Attendance).join(Employee)
        
        if start_date:
            query = query.filter(Attendance.date >= start_date.strftime('%Y-%m-%d'))
        if end_date:
            query = query.filter(Attendance.date <= end_date.strftime('%Y-%m-%d'))
        if employee_id:
            query = query.filter(Attendance.employee_id == employee_id)
            
        attendance_records = query.order_by(Attendance.date.desc()).all()
        
        report_data = []
        for record in attendance_records:
            report_data.append({
                'Date': record.date,
                'Employee ID': record.employee.employee_id,
                'Employee Name': record.employee.name,
                'Department': record.employee.department or 'N/A',
                'Check In': record.check_in.strftime('%H:%M:%S') if record.check_in else 'N/A',
                'Check Out': record.check_out.strftime('%H:%M:%S') if record.check_out else 'N/A',
                'Total Hours': f"{record.total_hours:.2f}" if record.total_hours else '0.00',
                'Status': record.status.title(),
                'Notes': record.notes or ''
            })
        
        return report_data

    def generate_pdf_report(self, start_date: Optional[date] = None, end_date: Optional[date] = None, 
                           employee_id: Optional[int] = None) -> io.BytesIO:
        """Generate PDF attendance report"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Build content
        content = []
        
        # Title
        title = "Attendance Report"
        if start_date and end_date:
            title += f" ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')})"
        content.append(Paragraph(title, title_style))
        content.append(Spacer(1, 20))
        
        # Get data
        data = self.get_attendance_data(start_date, end_date, employee_id)
        
        if not data:
            content.append(Paragraph("No attendance records found for the specified criteria.", styles['Normal']))
        else:
            # Create table
            table_data = [['Date', 'Employee ID', 'Name', 'Department', 'Check In', 'Check Out', 'Hours', 'Status']]
            
            for record in data:
                table_data.append([
                    record['Date'],
                    record['Employee ID'],
                    record['Employee Name'][:20] + '...' if len(record['Employee Name']) > 20 else record['Employee Name'],
                    record['Department'][:10] + '...' if len(record['Department']) > 10 else record['Department'],
                    record['Check In'],
                    record['Check Out'],
                    record['Total Hours'],
                    record['Status']
                ])
            
            # Create table
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            content.append(table)
            
            # Summary
            content.append(Spacer(1, 20))
            summary_text = f"Total Records: {len(data)}"
            content.append(Paragraph(summary_text, styles['Normal']))
        
        # Generate report info
        content.append(Spacer(1, 30))
        report_info = f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        content.append(Paragraph(report_info, styles['Italic']))
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        return buffer

    def generate_excel_report(self, start_date: Optional[date] = None, end_date: Optional[date] = None, 
                             employee_id: Optional[int] = None) -> io.BytesIO:
        """Generate Excel attendance report"""
        data = self.get_attendance_data(start_date, end_date, employee_id)
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Attendance Report', index=False)
            
            # Get workbook and worksheet
            workbook = writer.book
            worksheet = writer.sheets['Attendance Report']
            
            # Auto-adjust column widths
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
            
            # Add summary sheet
            summary_data = {
                'Metric': ['Total Records', 'Date Range', 'Generated On'],
                'Value': [
                    len(data),
                    f"{start_date or 'All'} to {end_date or 'All'}",
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                ]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        buffer.seek(0)
        return buffer

    def get_employee_summary(self, employee_id: int, start_date: Optional[date] = None, 
                           end_date: Optional[date] = None) -> dict:
        """Get summary statistics for an employee"""
        
        # If no date range provided, use a reasonable default (last 30 days)
        if not start_date or not end_date:
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
        
        # Get attendance records for the period
        query = self.db.query(Attendance).filter(Attendance.employee_id == employee_id)
        query = query.filter(Attendance.date >= start_date.strftime('%Y-%m-%d'))
        query = query.filter(Attendance.date <= end_date.strftime('%Y-%m-%d'))
        records = query.all()
        
        # Calculate expected working days (Monday to Friday only)
        current_date = start_date
        expected_working_days = 0
        
        while current_date <= end_date:
            # Count weekdays only (Monday=0, Sunday=6)
            if current_date.weekday() < 5:  # Monday to Friday
                expected_working_days += 1
            current_date += timedelta(days=1)
        
        # Count actual attendance
        present_days = len([r for r in records if r.check_in is not None])
        late_days = len([r for r in records if r.check_in and r.check_in.time() > datetime.strptime("09:00", "%H:%M").time()])
        total_hours = sum([r.total_hours or 0 for r in records])
        
        # Calculate absent days correctly: Expected - Present
        absent_days = max(0, expected_working_days - present_days)
        
        # Calculate attendance rate: Present / Expected * 100
        attendance_rate = round((present_days / expected_working_days * 100) if expected_working_days > 0 else 0, 2)
        
        return {
            'total_days': expected_working_days,  # Expected working days in period
            'present_days': present_days,         # Days with check-in
            'late_days': late_days,              # Days late (after 9:00 AM)
            'absent_days': absent_days,          # Expected - Present
            'total_hours': round(total_hours, 2), # Sum of all hours worked
            'attendance_rate': attendance_rate    # (Present / Expected) * 100
        }
