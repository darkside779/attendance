#!/bin/bash
set -o errexit

echo "🚀 Starting Render build process..."

# Upgrade pip and install build tools
echo "📦 Upgrading pip and installing build tools..."
pip install --upgrade pip setuptools wheel

# Install dependencies with no cache to avoid build issues
echo "📚 Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

# Initialize database if needed
echo "🗄️ Setting up database..."
if [ ! -f "attendance.db" ]; then
    echo "📁 Creating new SQLite database..."
    python init_db.py
fi

# Run database migrations
echo "🔄 Running database migrations..."
python -m alembic upgrade head

echo "✅ Build process completed successfully!"
