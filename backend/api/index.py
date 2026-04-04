"""Vercel serverless entry point for the FastAPI backend.

Adjusts sys.path so that 'from backend.xxx import yyy' imports resolve
correctly when Vercel runs this file from within the backend/ directory.
"""

import os
import sys

# The backend directory is the parent of this api/ folder.
# The project root (parent of backend/) must be on sys.path so that
# `from backend.config import settings` etc. work unchanged.
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_project_root = os.path.dirname(_backend_dir)

if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Now import the actual FastAPI app
from backend.main import app  # noqa: E402

# Vercel expects the ASGI app to be named `app` (already satisfied by the import above).
