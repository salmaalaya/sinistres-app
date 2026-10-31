import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("app.email")


def is_configured() -> bool:
    return bool(settings.smtp_username and settings.smtp_password and settings.smtp_from_address)


def send_otp_email(to_address: str, code: str, ttl_minutes: int) -> bool:
    """Envoie le code OTP par e-mail reel via SMTP. Retourne False (sans lever
    d'exception) si le SMTP n'est pas configure ou si l'envoi echoue, pour que
    l'appelant puisse retomber sur le mode simulation (log serveur) sans faire
    echouer toute la requete forgot-password."""
    if not is_configured():
        logger.info("SMTP non configure : email OTP non envoye a %s (mode simulation).", to_address)
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = "Sinistres BIAT - Code de verification"
    message["From"] = settings.smtp_from_address
    message["To"] = to_address

    text = (
        f"Votre code de verification Sinistres BIAT est : {code}\n\n"
        f"Ce code expire dans {ttl_minutes} minutes. Si vous n'etes pas a "
        "l'origine de cette demande, ignorez cet e-mail."
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;
                background:#0A140D;color:#EEF3EC;border-radius:12px;">
      <p style="font-size:13px;color:#8FA394;margin:0 0 4px;">Sinistres BIAT</p>
      <h2 style="margin:0 0 16px;color:#EEF3EC;">Code de verification</h2>
      <p style="font-size:14px;color:#8FA394;margin:0 0 20px;">
        Utilisez ce code pour reinitialiser votre mot de passe :
      </p>
      <p style="font-family:monospace;font-size:32px;font-weight:bold;letter-spacing:8px;
                color:#8DC63F;margin:0 0 20px;text-align:center;">{code}</p>
      <p style="font-size:12px;color:#556354;margin:0;">
        Ce code expire dans {ttl_minutes} minutes. Si vous n'etes pas a l'origine
        de cette demande, ignorez cet e-mail.
      </p>
    </div>
    """
    message.attach(MIMEText(text, "plain"))
    message.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_address, [to_address], message.as_string())
        logger.info("Email OTP envoye a %s.", to_address)
        return True
    except Exception:
        logger.exception("Echec de l'envoi de l'email OTP a %s.", to_address)
        return False


def send_critical_dossiers_email(to_address: str, dossiers: list[dict]) -> bool:
    """Envoie un recap unique (un email par destinataire, pas un par dossier)
    listant les dossiers critiques. Volontairement sobre - pas de montants ni
    d'autres donnees sensibles au-dela du code dossier, du motif et du delai.
    Retourne False (sans lever) si le SMTP n'est pas configure ou si l'envoi
    echoue, pour que l'appelant (le job planifie) puisse le journaliser et
    continuer avec les autres destinataires plutot que de tout interrompre."""
    if not is_configured():
        logger.info(
            "SMTP non configure : notification dossiers critiques non envoyee a %s (mode simulation).",
            to_address,
        )
        return False

    count = len(dossiers)
    message = MIMEMultipart("alternative")
    message["Subject"] = f"Sinistres BIAT - {count} dossier{'s' if count > 1 else ''} critique{'s' if count > 1 else ''}"
    message["From"] = settings.smtp_from_address
    message["To"] = to_address

    lines_text = "\n".join(
        f"- Dossier {d['code_sinistre']} ({d['n_sinistre']}) : ouvert depuis {d['jours_ouverture']} jours"
        for d in dossiers
    )
    text = (
        f"{count} dossier(s) critique(s) necessitent votre attention :\n\n{lines_text}\n\n"
        f"Voir le detail : {settings.frontend_url}/alertes"
    )

    rows_html = "".join(
        f"<tr><td style='padding:6px 10px;border-bottom:1px solid #2A3A30;'>{d['code_sinistre']}</td>"
        f"<td style='padding:6px 10px;border-bottom:1px solid #2A3A30;'>{d['n_sinistre']}</td>"
        f"<td style='padding:6px 10px;border-bottom:1px solid #2A3A30;text-align:right;'>{d['jours_ouverture']} j</td></tr>"
        for d in dossiers
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;
                background:#0A140D;color:#EEF3EC;border-radius:12px;">
      <p style="font-size:13px;color:#8FA394;margin:0 0 4px;">Sinistres BIAT</p>
      <h2 style="margin:0 0 16px;color:#EEF3EC;">{count} dossier{'s' if count > 1 else ''} critique{'s' if count > 1 else ''}</h2>
      <p style="font-size:13px;color:#8FA394;margin:0 0 16px;">
        Ces dossiers depassent le seuil de delai de traitement sans etre clotures :
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        <thead>
          <tr style="color:#8FA394;text-align:left;">
            <th style="padding:6px 10px;">Code</th><th style="padding:6px 10px;">N&deg; sinistre</th>
            <th style="padding:6px 10px;text-align:right;">Delai</th>
          </tr>
        </thead>
        <tbody>{rows_html}</tbody>
      </table>
      <a href="{settings.frontend_url}/alertes"
         style="display:inline-block;background:#8DC63F;color:#0A140D;font-weight:bold;
                text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;">
        Voir la page Alertes
      </a>
    </div>
    """
    message.attach(MIMEText(text, "plain"))
    message.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_address, [to_address], message.as_string())
        logger.info("Notification dossiers critiques envoyee a %s (%d dossiers).", to_address, count)
        return True
    except Exception:
        logger.exception("Echec de l'envoi de la notification dossiers critiques a %s.", to_address)
        return False
