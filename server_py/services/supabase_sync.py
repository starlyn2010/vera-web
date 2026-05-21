import os
import json
import logging
import urllib.request
import urllib.error
import threading

logger = logging.getLogger("supabase_sync")

def _is_vercel() -> bool:
    return bool(os.getenv("VERCEL"))

def _do_sync(doc_id: str, doc_tipo: str, payload: dict):
    """
    Synchronously pushes a document payload to Supabase using REST API.
    Fails silently if network is unavailable to ensure offline app functionality.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        # We use warning here because this is often the cause of QR issues on Vercel
        logger.warning(f"Skipping Supabase sync for {doc_id} (Missing environment variables: SUPABASE_URL/KEY)")
        return

    # Clean URL and prepare endpoint
    supabase_url = supabase_url.rstrip("/")
    # Upsert by `id` so re-generating a QR/Factura/Reporte refreshes the payload
    endpoint = f"{supabase_url}/rest/v1/verificaciones?on_conflict=id"

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        # Do not return the inserted row to save bandwidth, but allow upsert merges.
        "Prefer": "resolution=merge-duplicates,return=minimal"
    }

    data = {
        "id": doc_id,
        "tipo": doc_tipo,
        "payload": payload
    }

    try:
        json_data = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(endpoint, data=json_data, headers=headers, method="POST")
        
        # We use a short timeout because this is just a background sync.
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status in (200, 201, 204):
                logger.info(f"Successfully synced document {doc_id} to Supabase")
            else:
                logger.warning(f"Unexpected response from Supabase for {doc_id}: {response.status}")
    except urllib.error.HTTPError as e:
        # If it's a conflict (409), maybe it already exists.
        if e.code == 409:
            logger.info(f"Document {doc_id} already exists in Supabase.")
        else:
            err_body = e.read().decode('utf-8') if e.fp else ""
            logger.error(f"HTTP error syncing {doc_id} to Supabase: {e.code} {e.reason} - {err_body}")
    except urllib.error.URLError as e:
        logger.warning(f"Network error syncing {doc_id} to Supabase: {e.reason}. Working offline.")
    except Exception as e:
        logger.error(f"Unexpected error syncing {doc_id} to Supabase: {e}")

def sync_document_to_supabase(doc_id: str, doc_tipo: str, payload: dict):
    """
    Fires off a background thread to sync the document to Supabase.
    This guarantees that the main FastAPI/SQLite transaction is not blocked by network latency.
    """
    # IMPORTANT:
    # - On Vercel serverless, daemon threads may be terminated when the request finishes,
    #   which means the sync might never happen. Run inline there.
    # - On desktop/local, keep it async to avoid blocking UI / API latency.
    if _is_vercel():
        _do_sync(doc_id, doc_tipo, payload)
        return

    thread = threading.Thread(target=_do_sync, args=(doc_id, doc_tipo, payload), daemon=True)
    thread.start()
