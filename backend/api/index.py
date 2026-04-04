"""Vercel serverless entry point - minimal startup with error catching."""

import os
import sys
import types
import traceback

# Setup paths for backend imports
_task_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_parent_dir = os.path.dirname(_task_dir)

# Add both parent and task dir to path
for p in [_parent_dir, _task_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Try to create virtual backend package if needed
try:
    import backend
except ImportError:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [_task_dir]
    backend_pkg.__file__ = os.path.join(_task_dir, "__init__.py")
    sys.modules["backend"] = backend_pkg

# Try importing the real app, fallback to minimal one on error
try:
    from backend.main import app
except Exception as e:
    # Fallback: create a minimal app that shows the error
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    app = FastAPI(title="AI Agent Platform - Debug Mode")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    _startup_error = f"{type(e).__name__}: {e}\n\n{traceback.format_exc()}"

    @app.get("/api/health")
    async def health():
        return {
            "status": "error",
            "startup_error": _startup_error,
            "python_version": sys.version,
            "sys_path": sys.path[:5],
            "task_dir": _task_dir,
            "task_dir_contents": os.listdir(_task_dir)[:20] if os.path.isdir(_task_dir) else "NOT A DIR",
        }

    @app.get("/{path:path}")
    async def catch_all(path: str):
        return {"error": _startup_error, "path": path}
