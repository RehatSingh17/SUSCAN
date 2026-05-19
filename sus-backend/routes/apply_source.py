# sus-backend/routes/apply_source.py

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv
load_dotenv()

router = APIRouter()

class ApplicationForm(BaseModel):
    name: str
    organization: str
    email: str
    website: str = ""
    region: str = ""
    monthlyReaders: str = ""
    description: str

@router.post("/api/apply-source")
async def apply_source(form: ApplicationForm):
    try:
        # ── Pull credentials from .env ──────────────────────────────────
        smtp_host     = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port     = int(os.getenv("SMTP_PORT", 587))
        smtp_user     = os.getenv("SMTP_USER")   # your Gmail that SENDS
        smtp_password = os.getenv("SMTP_PASSWORD") # Gmail App Password
        to_email      = "rehatsinghjagirdar@gmail.com"

        # ── Build HTML email body ───────────────────────────────────────
        html_body = f"""
        <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A18;">
          <div style="background: #1A1A18; padding: 28px 32px; border-radius: 16px 16px 0 0;">
            <h1 style="color: #FAFAF8; font-size: 22px; margin: 0;">
              📬 New Source Application
            </h1>
            <p style="color: rgba(255,255,255,0.5); margin: 6px 0 0; font-size: 14px;">
              via SUSCAN · Trusted Sources Network
            </p>
          </div>

          <div style="background: #fff; border: 1px solid #E2E0D8; border-top: none; padding: 32px; border-radius: 0 0 16px 16px;">

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 13px; color: #888780; width: 160px;">Full Name</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 14px; font-weight: 600;">{form.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 13px; color: #888780;">Organization</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 14px; font-weight: 600;">{form.organization}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 13px; color: #888780;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 14px;">
                  <a href="mailto:{form.email}" style="color: #1A1A18;">{form.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 13px; color: #888780;">Website</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 14px;">
                  {f'<a href="{form.website}" style="color: #1A1A18;">{form.website}</a>' if form.website else '—'}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 13px; color: #888780;">Region</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 14px;">{form.region or '—'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 13px; color: #888780;">Monthly Readers</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #F0EFE9; font-size: 14px;">{form.monthlyReaders or '—'}</td>
              </tr>
            </table>

            <div style="margin-top: 24px;">
              <p style="font-size: 13px; color: #888780; margin-bottom: 10px;">About their organization:</p>
              <div style="background: #FAFAF8; border: 1px solid #EEEDE8; border-radius: 12px; padding: 16px 18px; font-size: 14px; line-height: 1.8; color: #444;">
                {form.description}
              </div>
            </div>

            <div style="margin-top: 28px; padding: 16px 18px; background: #D1FAE5; border-radius: 12px; font-size: 13px; color: #065F46; font-weight: 600;">
              ✓ Reply directly to this email to contact the applicant at {form.email}
            </div>
          </div>
        </div>
        """

        # ── Send via SMTP ───────────────────────────────────────────────
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[SUSCAN] New Source Application – {form.organization}"
        msg["From"]    = smtp_user
        msg["To"]      = to_email
        msg["Reply-To"] = form.email  # so you can reply directly to applicant

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to_email, msg.as_string())

        return {"ok": True, "message": "Application received"}

    except Exception as e:
        print(f"[apply-source] Email error: {e}")

        return {
            "ok": False,
            "error": str(e)
        }