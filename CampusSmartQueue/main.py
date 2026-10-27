"""
Campus SmartQueue 2.0 - Root Application Entrypoint
Exposes the FastAPI app instance for Vercel, Uvicorn, and ASGI servers.
"""

from app.api import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
