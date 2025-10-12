#!/bin/bash

# Start the application without reload for production
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1
