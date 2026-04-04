"""Vercel serverless entry point for the FastAPI backend."""

import os
import sys
import types
import traceback

# Setup: make "backend" package importable
_here = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_here)
_project_root = os.path.dirname(_backend_dir)

for p in [_project_root, _backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

if "backend" not in sys.modules:
    try:
        import backend as _test
    except ImportError:
        _pkg = types.ModuleType("backend")
        _pkg.__path__ = [_backend_dir]
        _pkg.__file__ = os.path.join(_backend_dir, "__init__.py")
        sys.modules["backend"] = _pkg

# Import the app
try:
    from backend.main import app
except Exception:
    # Fallback: minimal FastAPI app showing the error
    _err = traceback.format_exc()
    
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI()
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    
    @app.get("/api/health")
    @app.get("/{path:path}")
    async def debug(path: str = ""):
        return {
            "error": _err,
            "cwd": os.getcwd(),
            "files": sorted(os.listdir(_backend_dir))[:20],
            "python": sys.version,
        }
