"""Vercel serverless entry point."""

import os
import sys
import json
import types
import traceback

def _setup_paths():
    """Setup Python paths for backend imports."""
    task_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    parent_dir = os.path.dirname(task_dir)
    
    for p in [parent_dir, task_dir]:
        if p not in sys.path:
            sys.path.insert(0, p)
    
    # Create virtual backend package if needed
    if "backend" not in sys.modules:
        try:
            import backend
        except ImportError:
            backend_pkg = types.ModuleType("backend")
            backend_pkg.__path__ = [task_dir]
            backend_pkg.__file__ = os.path.join(task_dir, "__init__.py")
            sys.modules["backend"] = backend_pkg

_setup_paths()

# Try importing the full app
_app = None
_error = None

try:
    from backend.main import app as _app
except Exception as e:
    _error = traceback.format_exc()

if _app is not None:
    app = _app
else:
    # Minimal ASGI app that shows the error - no external deps needed
    async def app(scope, receive, send):
        if scope["type"] == "http":
            body = json.dumps({
                "status": "startup_error",
                "error": _error or "Unknown error",
                "python": sys.version,
                "cwd": os.getcwd(),
                "listdir": os.listdir(os.getcwd())[:30],
                "sys_path": sys.path[:10],
            }, indent=2).encode()
            
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [
                    [b"content-type", b"application/json"],
                    [b"access-control-allow-origin", b"*"],
                ],
            })
            await send({
                "type": "http.response.body",
                "body": body,
            })
