"""SMTP Email dispatcher supporting multipart HTML and plain-text fallbacks."""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from src.config import AppConfig


def send_email(
    subject: str,
    html_content: str,
    text_content: str,
    config: AppConfig,
    to_email: str = None,
) -> bool:
    """Send a multipart HTML newsletter email via SMTP."""
    recipient = to_email or config.email_to
    if not recipient:
        raise ValueError("Recipient email (EMAIL_TO) is not specified.")

    if not config.smtp_user or not config.smtp_pass:
        raise ValueError("SMTP_USER or SMTP_PASS is missing. Check your .env file or GitHub Secrets.")

    sender = config.email_from or config.smtp_user

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient

    # Attach plain text first, followed by HTML (email clients prefer the last valid part)
    part_text = MIMEText(text_content, "plain", "utf-8")
    part_html = MIMEText(html_content, "html", "utf-8")
    msg.attach(part_text)
    msg.attach(part_html)

    print(f"📧 Connecting to SMTP server {config.smtp_host}:{config.smtp_port}...")
    try:
        with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(config.smtp_user, config.smtp_pass)
            server.sendmail(sender, [recipient], msg.as_string())
        print(f"🚀 Email successfully delivered to {recipient}!")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ SMTP Authentication failed: {e}")
        print("💡 Tip for Gmail: Make sure you use a 16-character App Password (not your normal password).")
        raise
    except Exception as e:
        print(f"❌ Failed to deliver email: {e}")
        raise
