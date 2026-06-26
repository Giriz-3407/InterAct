import os
import re
import urllib.request
import urllib.error
import json
import logging
import time
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse

logger = logging.getLogger("interact.agent_api")
router = APIRouter(prefix="/api", tags=["agent"])

GITHUB_REPO = os.getenv("GITHUB_REPO", "Giriz-3407/InterAct-Agent")

# Simple in-memory cache to prevent GitHub rate-limiting
_cache = {
    "data": None,
    "timestamp": 0
}
CACHE_TTL_SECONDS = 300 # 5 minutes

def get_latest_github_release():
    """
    Fetch the latest release information from GitHub, using a local cache.
    """
    now = time.time()
    if _cache["data"] and (now - _cache["timestamp"] < CACHE_TTL_SECONDS):
        return _cache["data"]

    url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "InterAct-Backend-API/1.0.0"}
    )
    try:
        logger.info(f"Querying GitHub API for latest release metadata: {url}")
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status != 200:
                # If GitHub returned an error but we have stale cache, serve it
                if _cache["data"]:
                    logger.warning("GitHub API returned error, serving stale cache")
                    return _cache["data"]
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"GitHub API returned status {response.status}"
                )
            data = json.loads(response.read().decode())
            _cache["data"] = data
            _cache["timestamp"] = now
            return data
    except urllib.error.HTTPError as e:
        if _cache["data"]:
            logger.warning(f"GitHub API HTTP error {e.code}, serving stale cache")
            return _cache["data"]
        if e.code in (403, 429):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="GitHub API rate limit exceeded. Please try again later."
            )
        elif e.code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No releases found on GitHub."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to query GitHub API: {e.reason}"
            )
    except Exception as e:
        if _cache["data"]:
            logger.warning(f"GitHub API connection error, serving stale cache: {e}")
            return _cache["data"]
        logger.error(f"Error querying GitHub API: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error connecting to GitHub: {str(e)}"
        )

@router.get("/download/windows")
def download_windows():
    """
    Get the latest Windows installer asset from GitHub Releases and redirect the client to it.
    """
    release_data = get_latest_github_release()
    
    # Extra safety check to ignore draft or prerelease
    if release_data.get("draft") or release_data.get("prerelease"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Latest release is draft or prerelease."
        )

    assets = release_data.get("assets", [])
    download_url = None
    
    # Match installer filename format: InterAct-Desktop-Agent-.*-Setup.exe
    pattern = re.compile(r"^InterAct-Desktop-Agent-.*-Setup\.exe$", re.IGNORECASE)
    
    for asset in assets:
        name = asset.get("name", "")
        if pattern.match(name):
            download_url = asset.get("browser_download_url")
            break

    if not download_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Windows installer setup executable not found in the latest release."
        )

    # 307 Temporary Redirect directly to the asset URL
    logger.info(f"Redirecting download request to: {download_url}")
    return RedirectResponse(url=download_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

@router.get("/version/latest")
def get_latest_version():
    """
    Get version and metadata for the latest release.
    """
    release_data = get_latest_github_release()
    
    tag_name = release_data.get("tag_name", "0.0.0")
    version = tag_name.lstrip("vV") # Strip leading "v"
    
    return {
        "version": version,
        "published_at": release_data.get("published_at"),
        "release_notes": release_data.get("body", ""),
        "download_url": "/api/download/windows"
    }
