import logging
import tempfile
import os

logger = logging.getLogger(__name__)

def verify_c2pa_metadata(file_bytes: bytes, file_extension: str = ".jpg") -> dict:
    """
    Checks for Content Provenance and Authenticity (C2PA) metadata in the file.
    Returns a dictionary with provenance data if found.
    """
    try:
        from c2pa import Reader
        
        # c2pa-python typically requires reading from a file path
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name
            
        try:
            reader = Reader(temp_path)
            manifest = reader.get_active_manifest()
            
            if manifest:
                issuer = manifest.get("issuer", "Unknown Issuer")
                return {
                    "is_verified": True,
                    "issuer": issuer,
                    "details": "Cryptographically signed provenance metadata found."
                }
            else:
                return {"is_verified": False, "details": "No C2PA manifest found."}
                
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except ImportError:
        logger.warning("c2pa-python is not installed. Skipping C2PA check.")
        return {"is_verified": False, "details": "C2PA verification module unavailable."}
    except Exception as e:
        logger.error(f"C2PA Verification Error: {e}")
        return {"is_verified": False, "details": f"Error reading metadata: {str(e)}"}
