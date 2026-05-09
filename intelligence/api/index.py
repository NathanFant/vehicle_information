import sys
import os

# Make the `app` package importable when Vercel runs this file from the api/ subdirectory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app  # noqa: F401  — Vercel ASGI runner picks up `app`
