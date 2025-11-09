"""Gmail service for sending emails via Gmail API."""
import logging
import os
import json
import base64
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

from app.core.exceptions import ToolError

env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    ".env"
)
load_dotenv(env_path)

logger = logging.getLogger(__name__)


TOKEN_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "gmail_token.json"
)
SCOPES = ['https://www.googleapis.com/auth/gmail.send']
GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"


class GmailService:
    """Service for Gmail API operations."""
    
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.credentials = None
        self.service = None
        
    def _load_token(self) -> Optional[dict]:
        """Load stored OAuth2 token."""
        if os.path.exists(TOKEN_FILE):
            try:
                with open(TOKEN_FILE, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading token from {TOKEN_FILE}: {e}")
        else:
            logger.warning(f"Gmail token file not found at {TOKEN_FILE}. Gmail authentication required.")
        return None
    
    def _save_token(self, token: dict):
        """Save OAuth2 token."""
        try:
            with open(TOKEN_FILE, 'w') as f:
                json.dump(token, f)
        except Exception as e:
            logger.error(f"Error saving token: {e}")
    
    def _get_credentials(self):
        """Get valid OAuth2 credentials."""
        if not self.client_id or not self.client_secret:
            logger.warning("Google Cloud credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET) not configured")
            return None
        
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request
            
            token = self._load_token()
            if not token:
                logger.warning("No Gmail token found. Authentication required.")
                return None
                
            self.credentials = Credentials.from_authorized_user_info(token, SCOPES)
            
            if self.credentials and self.credentials.valid:
                return self.credentials
            
            if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                try:
                    self.credentials.refresh(Request())
                    self._save_token(self._serialize_credentials(self.credentials))
                    return self.credentials
                except Exception as e:
                    logger.error(f"Error refreshing credentials: {e}")
                    return None
            else:
                logger.warning("Gmail credentials expired and no refresh token available. Re-authentication required.")
                return None
        except ImportError:
            logger.error("Google API libraries not installed. Install with: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
        except Exception as e:
            logger.error(f"Error getting credentials: {e}")
        
        return None
    
    def _get_service(self):
        """Get Gmail API service instance."""
        if self.service:
     
            if not os.path.exists(TOKEN_FILE):
                logger.warning(f"Token file {TOKEN_FILE} was deleted. Resetting cached service.")
                self.service = None
                self.credentials = None
            else:
                try:
                    if self.credentials and not self.credentials.valid:
                        if self.credentials.expired and self.credentials.refresh_token:
                            try:
                                from google.auth.transport.requests import Request
                                self.credentials.refresh(Request())
                                self._save_token(self._serialize_credentials(self.credentials))
                            except Exception as e:
                                logger.warning(f"Could not refresh credentials: {e}. Resetting service.")
                                self.service = None
                                self.credentials = None
                        else:
                            logger.warning("Credentials expired and cannot be refreshed. Resetting service.")
                            self.service = None
                            self.credentials = None
                except Exception as e:
                    logger.warning(f"Error validating cached credentials: {e}. Resetting service.")
                    self.service = None
                    self.credentials = None
        
        if not self.service:
            credentials = self._get_credentials()
            if not credentials:
                logger.warning("Cannot create Gmail service: No valid credentials available")
                return None
            
            try:
                from googleapiclient.discovery import build
                self.service = build('gmail', 'v1', credentials=credentials)
                return self.service
            except Exception as e:
                logger.error(f"Error building Gmail service: {e}")
                return None
        
        return self.service
    
    def is_authenticated(self) -> bool:
        """Check if Gmail service is authenticated."""
        return self._get_service() is not None
    
    def _create_flow(self, redirect_uri: str):
        """Create OAuth2 flow instance."""
        from google_auth_oauthlib.flow import Flow
        
        return Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": GOOGLE_AUTH_URI,
                    "token_uri": GOOGLE_TOKEN_URI,
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=SCOPES
        )
    
    def get_auth_url(self, redirect_uri: str) -> Optional[str]:
        """Get OAuth2 authorization URL."""
        if not self.client_id or not self.client_secret:
            return None
        
        try:
            flow = self._create_flow(redirect_uri)
            flow.redirect_uri = redirect_uri
            auth_url, _ = flow.authorization_url(prompt='consent')
            return auth_url
        except Exception as e:
            logger.error(f"Error generating auth URL: {e}")
            return None
    
    def _serialize_credentials(self, credentials) -> dict:
        """Serialize credentials to dict for storage."""
        return {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
    
    def handle_oauth_callback(self, code: str, redirect_uri: str) -> bool:
        """Handle OAuth2 callback and save token."""
        if not self.client_id or not self.client_secret:
            return False
        
        try:
            flow = self._create_flow(redirect_uri)
            flow.redirect_uri = redirect_uri
            flow.fetch_token(code=code)
            
            credentials = flow.credentials
            self.credentials = credentials
            self.service = None
            
            self._save_token(self._serialize_credentials(credentials))
            return True
        except Exception as e:
            logger.error(f"Error handling OAuth callback: {e}")
            return False
    
    def send_email(
        self,
        sender_email: str,
        recipient_email: str,
        subject: str,
        message: str,
        cc: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> str:
        """Send email via Gmail API."""
        service = self._get_service()
        if not service:
            error_msg = (
                "FEHLER: Gmail-Service ist nicht authentifiziert. "
                "Die gmail_token.json Datei fehlt oder ist ungültig. "
                "Bitte authentifizieren Sie sich zuerst über den Gmail-Authentifizierungs-Endpunkt."
            )
            logger.error(error_msg)
            raise ToolError(error_msg)
        
        try:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = recipient_email
            msg['Subject'] = subject.strip()
            
            if cc:
                msg['Cc'] = cc
            if bcc:
                msg['Bcc'] = bcc
            
            msg.attach(MIMEText(message.strip(), 'plain'))
            
            raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
            
            message_obj = service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            message_id = message_obj.get('id')
            logger.info(f"Email sent successfully. Message ID: {message_id}")
            return f"Email sent successfully! Message ID: {message_id}"
        except ToolError:
            raise
        except Exception as e:
            error_msg = f"FEHLER beim Senden der E-Mail: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise ToolError(error_msg) from e

