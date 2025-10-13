#!/bin/bash
set -o errexit

echo "🚀 Starting Render build process..."

# Upgrade pip and install build tools
echo "📦 Upgrading pip and installing build tools..."
pip install --upgrade pip setuptools wheel

# Install dependencies with no cache to avoid build issues
echo "📚 Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

# Initialize database and ensure all tables exist
echo "🗄️ Setting up database..."

# Always run database initialization to ensure tables exist
echo "📁 Initializing database tables..."
python init_db.py

# Run database migrations to ensure schema is up to date
echo "🔄 Running database migrations..."
python -m alembic upgrade head

# Verify database tables exist
echo "🔍 Verifying database setup..."
python -c "
from app.core.database import engine
from sqlalchemy import text
import subprocess

required_tables = ['users', 'employees', 'attendance', 'shifts', 'payroll_records']

try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT name FROM sqlite_master WHERE type=\"table\"'))
        tables = [row[0] for row in result]
        print(f'📊 Found {len(tables)} tables: {tables}')
        
        missing_tables = [t for t in required_tables if t not in tables]
        if missing_tables:
            print(f'⚠️ Missing tables: {missing_tables}')
            print('🔧 Running init_db again to create missing tables...')
            subprocess.run(['python', 'init_db.py'], check=True)
        else:
            print('✅ All required tables exist!')
            
except Exception as e:
    print(f'❌ Database verification failed: {e}')
    print('🔧 Running init_db to fix database issues...')
    subprocess.run(['python', 'init_db.py'], check=True)
"

echo "✅ Build process completed successfully!"
