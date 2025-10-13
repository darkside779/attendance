#!/bin/bash
set -o errexit

# Upgrade pip and install build tools
pip install --upgrade pip setuptools wheel

# Install dependencies with no cache to avoid build issues
pip install --no-cache-dir -r requirements.txt

# Run database migrations
python -m alembic upgrade head
