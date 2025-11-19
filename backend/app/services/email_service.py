"""
Email service for sending invoices and notifications.
Supports SMTP and can be extended to use services like SendGrid, AWS SES, etc.
"""

from typing import Optional, Dict, Any
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os

from ..config import get_settings


class EmailService:
    """Service for sending emails."""
    
    def __init__(self):
        self.settings = get_settings()
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
    
    def is_available(self) -> bool:
        """Check if email service is configured."""
        return bool(self.smtp_username and self.smtp_password)
    
    def send_invoice_email(
        self,
        to_email: str,
        customer_name: str,
        bill_number: str,
        total_amount: float,
        invoice_pdf_path: Optional[str] = None
    ) -> bool:
        """Send invoice via email."""
        if not self.is_available():
            print("⚠️  Email service not configured")
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = f"Invoice #{bill_number} - Omaguva Store"
            
            # Email body
            body = f"""
Dear {customer_name},

Thank you for your purchase at Omaguva Store!

Your invoice details:
- Invoice Number: {bill_number}
- Total Amount: ₹{total_amount:.2f}

Please find your invoice attached.

Best regards,
Omaguva Store Team
"""
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach PDF if provided
            if invoice_pdf_path and os.path.exists(invoice_pdf_path):
                with open(invoice_pdf_path, "rb") as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename=invoice_{bill_number}.pdf'
                    )
                    msg.attach(part)
            
            # Send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            text = msg.as_string()
            server.sendmail(self.from_email, to_email, text)
            server.quit()
            
            print(f"✅ Invoice email sent to {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Error sending email: {e}")
            return False


# Global email service instance
email_service = EmailService()

