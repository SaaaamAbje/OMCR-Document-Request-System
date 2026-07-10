from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

# Input validator matching your dashboard request form fields
class RequestEntry(BaseModel):
    name: str
    contact: str
    doctype: str
    purpose: Optional[str] = "General Documentation"
    copies: Optional[int] = 1

@app.get("/api/health")
def health_check():
    """Verifies that the server backend is running smoothly."""
    return {"status": "healthy", "system": "OMCR Document Request System"}

@app.post("/api/requests/walkin")
def create_walkin_request(entry: RequestEntry):
    """
    Endpoint called when someone registers a walk-in at the counter.
    You can hook this up to write to your database or Supabase client here.
    """
    if not entry.name or not entry.contact or not entry.doctype:
        raise HTTPException(status_code=400, detail="Missing required input parameters")

    # Example logic generating your tracking schema control number
    import random
    generated_ctrl = f"OMCR-2026-{random.randint(1000, 9999)}"

    return {
        "success": True,
        "control_number": generated_ctrl,
        "message": "Entry logged in server backend database."
    }