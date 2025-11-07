from fastapi import APIRouter, HTTPException, Query, Depends

from app.core.dependencies import get_gmail_service
from app.core.settings import get_settings

router = APIRouter(prefix="/api/v1/gmail", tags=["gmail"])


@router.get("/auth")
def get_auth_url(
    redirect_uri: str = Query(default=None, description="OAuth2 redirect URI (optional, will be auto-detected)"),
    gmail_service=Depends(get_gmail_service),
    settings=Depends(get_settings)
):
    """Get OAuth2 authorization URL for Gmail."""
    try:
        if not redirect_uri:
            redirect_uri = f"{settings.api_base_url}{settings.gmail_callback_path}"
        
        auth_url = gmail_service.get_auth_url(redirect_uri)
        if not auth_url:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate auth URL. Check Google Cloud credentials."
            )
        
        return {"auth_url": auth_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/callback")
def oauth_callback(
    code: str = Query(..., description="OAuth2 authorization code"),
    redirect_uri: str = Query(default=None, description="OAuth2 redirect URI (optional, will be auto-detected)"),
    gmail_service=Depends(get_gmail_service),
    settings=Depends(get_settings)
):
    """Handle OAuth2 callback and save token."""
    try:
        if not redirect_uri:
            redirect_uri = f"{settings.api_base_url}{settings.gmail_callback_path}"
        
        success = gmail_service.handle_oauth_callback(code, redirect_uri)
        if not success:
            raise HTTPException(
                status_code=400,
                detail="Failed to authenticate. Please try again."
            )
        
        return {
            "status": "success",
            "message": "Gmail authenticated successfully! You can now send emails."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/status")
def get_auth_status(gmail_service=Depends(get_gmail_service)):
    """Check Gmail authentication status."""
    try:
        is_authenticated = gmail_service.is_authenticated()
        has_credentials = bool(gmail_service.client_id and gmail_service.client_secret)
        
        return {
            "authenticated": is_authenticated,
            "has_credentials": has_credentials,
            "status": "ready" if (is_authenticated and has_credentials) else "not_authenticated"
        }
    except Exception as e:
        return {
            "authenticated": False,
            "has_credentials": False,
            "status": "error",
            "error": str(e)
        }

