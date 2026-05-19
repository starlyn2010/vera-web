"""
Vercel serverless function for /api/verify/[report_id]
This file exists so Vercel's filesystem-based routing can find a handler
for /api/verify/* paths. It delegates to the main FastAPI app.
"""
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, "server_py"))

from server_py.main import app
