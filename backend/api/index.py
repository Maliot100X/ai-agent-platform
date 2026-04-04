"""Vercel serverless entry point for the FastAPI backend.

Handles the path setup for both local development and Vercel's
experimentalServices deployment where backend/ becomes the root.
"""

import os
import sys
import types

# The backend directory is the parent of this api/ folder
_task_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_parent_dir = os.path.dirname(_task_dir)

# Try 1: Normal setup (local dev / Docker) - parent dir has a backend/ package
sys.path.insert(0, _parent_dir)

try:
    from backend.main import app  # noqa: E402
except (ImportError, ModuleNotFoundError):
    # Try 2: Vercel serverless - backend files are in the task root directly.
    # We need to create a virtual "backend" package that maps to _task_dir
    # so all "from backend.xxx import yyy" imports resolve correctly.
    sys.path.insert(0, _task_dir)

    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [_task_dir]
    backend_pkg.__file__ = os.path.join(_task_dir, "__init__.py")
    sys.modules["backend"] = backend_pkg

    from backend.main import app  # noqa: E402, F811

# Vercel expects the ASGI app to be named `app`
