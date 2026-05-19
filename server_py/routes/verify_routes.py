from fastapi import APIRouter, HTTPException
import os
import json
import urllib.request
import urllib.error
import urllib.parse

router = APIRouter(prefix="/api/verify", tags=["verify"])

@router.get("/{report_id}")
async def verify_document(report_id: str):
    """
    Public verification endpoint.
    Queries Supabase using the service role key to securely retrieve the verification payload.
    Automatically checks for different ID formats (exact, order-*, report-*) to resolve collisions.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Verification service is not configured (missing Supabase keys).")

    supabase_url = supabase_url.rstrip("/")
    endpoint = f"{supabase_url}/rest/v1/verificaciones?select=*"

    # We will query for 'id' matching the report_id, OR 'order-report_id' OR 'report-report_id'.
    # Supabase PostgREST syntax for OR: or=(id.eq.123,id.eq.order-123,id.eq.report-123)
    # This prevents any collision issues without requiring frontend changes.
    or_query = f"or=(id.eq.{report_id},id.eq.order-{report_id},id.eq.report-{report_id})"
    
    # URL encode the query string
    encoded_query = urllib.parse.quote(or_query, safe='=(),.-')
    
    full_url = f"{endpoint}&{encoded_query}"

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Accept": "application/json"
    }

    try:
        req = urllib.request.Request(full_url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                if data and len(data) > 0:
                    # Return the first matching document
                    return data[0]
                else:
                    raise HTTPException(status_code=404, detail="Documento no encontrado o no válido.")
            else:
                raise HTTPException(status_code=response.status, detail="Error retrieving document from database.")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise HTTPException(status_code=404, detail="Documento no encontrado o no válido.")
        raise HTTPException(status_code=e.code, detail=f"Database error: {e.reason}")
    except urllib.error.URLError as e:
        raise HTTPException(status_code=503, detail="Service unavailable (database connection failed).")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
