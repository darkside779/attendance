#!/bin/bash

# Start the application
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
