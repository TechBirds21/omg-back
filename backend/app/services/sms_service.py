"""
SMS service for sending invoice links and notifications.
Supports various SMS providers like Twilio, AWS SNS, etc.
"""

from typing import Optional
import os
import requests

from ..config import get_settings


class SMSService:
    """Service for sending SMS."""
    
    def __init__(self):
        self.settings = get_settings()
        # Support multiple providers
        self.provider = os.getenv("SMS_PROVIDER", "twilio")  # twilio, aws_sns, msg91, etc.
        self.api_key = os.getenv("SMS_API_KEY")
        self.api_secret = os.getenv("SMS_API_SECRET")
        self.from_number = os.getenv("SMS_FROM_NUMBER")
        self.api_url = os.getenv("SMS_API_URL")
    
    def is_available(self) -> bool:
        """Check if SMS service is configured."""
        return bool(self.api_key and self.api_secret)
    
    def send_invoice_sms(
        self,
        to_phone: str,
        customer_name: str,
        bill_number: str,
        total_amount: float,
        invoice_url: Optional[str] = None
    ) -> bool:
        """Send invoice via SMS."""
        if not self.is_available():
            print("⚠️  SMS service not configured")
            return False
        
        try:
            message = f"""
Dear {customer_name},

Thank you for shopping at Omaguva Store!

Invoice: {bill_number}
Amount: ₹{total_amount:.2f}
{f'View: {invoice_url}' if invoice_url else ''}

- Omaguva Store
"""
            
            if self.provider == "twilio":
                return self._send_via_twilio(to_phone, message)
            elif self.provider == "msg91":
                return self._send_via_msg91(to_phone, message)
            else:
                # Generic HTTP API
                return self._send_via_generic(to_phone, message)
                
        except Exception as e:
            print(f"❌ Error sending SMS: {e}")
            return False
    
    def _send_via_twilio(self, to_phone: str, message: str) -> bool:
        """Send SMS via Twilio."""
        try:
            from twilio.rest import Client
            client = Client(self.api_key, self.api_secret)
            client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_phone
            )
            print(f"✅ SMS sent via Twilio to {to_phone}")
            return True
        except Exception as e:
            print(f"❌ Twilio error: {e}")
            return False
    
    def _send_via_msg91(self, to_phone: str, message: str) -> bool:
        """Send SMS via MSG91."""
        try:
            url = "https://api.msg91.com/api/v2/sendsms"
            payload = {
                "sender": self.from_number,
                "route": "4",
                "country": "91",
                "sms": [{
                    "message": message,
                    "to": [to_phone]
                }]
            }
            headers = {
                "authkey": self.api_key,
                "Content-Type": "application/json"
            }
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                print(f"✅ SMS sent via MSG91 to {to_phone}")
                return True
            return False
        except Exception as e:
            print(f"❌ MSG91 error: {e}")
            return False
    
    def _send_via_generic(self, to_phone: str, message: str) -> bool:
        """Send SMS via generic HTTP API."""
        if not self.api_url:
            print("⚠️  SMS API URL not configured")
            return False
        
        try:
            response = requests.post(
                self.api_url,
                json={
                    "to": to_phone,
                    "message": message,
                    "from": self.from_number
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
            if response.status_code == 200:
                print(f"✅ SMS sent via generic API to {to_phone}")
                return True
            return False
        except Exception as e:
            print(f"❌ Generic SMS API error: {e}")
            return False


# Global SMS service instance
sms_service = SMSService()

