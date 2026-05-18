import os
import json
import random
import smtplib
import time
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from celery import Celery
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

app = Celery("task_queue", broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    task_queues={
        "high":   {"exchange": "high",   "routing_key": "high"},
        "medium": {"exchange": "medium", "routing_key": "medium"},
        "low":    {"exchange": "low",    "routing_key": "low"},
    },
    task_default_queue="medium",
    task_default_exchange="medium",
    task_default_routing_key="medium",
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
)


def get_sync_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://taskuser:taskpass@localhost:5432/taskqueue")
    sync_url = DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url)
    Session = sessionmaker(bind=engine)
    return Session()


# ─── Task 1: Send Real Email ──────────────────────────────────────────────────

def run_send_email(payload: dict) -> dict:
    """
    Send a real email via Gmail SMTP.
    Required payload keys:
      - to: recipient email address
      - subject: email subject
      - body: email body text
    Optional env vars:
      - SMTP_EMAIL: sender gmail address
      - SMTP_PASSWORD: gmail app password (not your login password)
    """
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    to = payload.get("to")
    subject = payload.get("subject", "No Subject")
    body = payload.get("body", "")

    if not smtp_email or not smtp_password:
        raise Exception(
            "SMTP_EMAIL and SMTP_PASSWORD environment variables not set. "
            "Set them in docker-compose.yml under the worker service."
        )
    if not to:
        raise Exception("Payload missing required field: 'to' (recipient email)")

    msg = MIMEMultipart()
    msg["From"] = smtp_email
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(smtp_email, smtp_password)
        server.sendmail(smtp_email, to, msg.as_string())

    return {
        "sent": True,
        "from": smtp_email,
        "to": to,
        "subject": subject,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ─── Task 2: Scrape a Webpage ─────────────────────────────────────────────────

def run_scrape_webpage(payload: dict) -> dict:
    """
    Scrape a webpage and extract title, headings, links, and paragraph count.
    Required payload keys:
      - url: the webpage URL to scrape
    Optional:
      - max_links: max number of links to return (default 10)
    """
    import requests
    from bs4 import BeautifulSoup

    url = payload.get("url")
    max_links = payload.get("max_links", 10)

    if not url:
        raise Exception("Payload missing required field: 'url'")

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; TaskQueueBot/1.0)"
    }

    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Extract title
    title = soup.title.string.strip() if soup.title else "No title found"

    # Extract all headings
    headings = []
    for tag in ["h1", "h2", "h3"]:
        for h in soup.find_all(tag):
            text = h.get_text(strip=True)
            if text:
                headings.append({"tag": tag, "text": text[:100]})

    # Extract links
    links = []
    for a in soup.find_all("a", href=True)[:max_links]:
        href = a["href"]
        text = a.get_text(strip=True)[:50]
        if href.startswith("http"):
            links.append({"text": text, "url": href})

    # Count paragraphs
    paragraphs = len(soup.find_all("p"))

    # Word count from body text
    body_text = soup.get_text(separator=" ", strip=True)
    word_count = len(body_text.split())

    return {
        "url": url,
        "title": title,
        "headings": headings[:10],
        "links": links,
        "paragraph_count": paragraphs,
        "word_count": word_count,
        "status_code": response.status_code,
        "scraped_at": datetime.utcnow().isoformat(),
    }


# ─── Task 3: Generate PDF Report ─────────────────────────────────────────────

def run_generate_pdf(payload: dict) -> dict:
    """
    Generate a PDF report and save it to /app/reports/.
    Required payload keys:
      - title: report title
      - sections: list of {"heading": str, "content": str}
    Optional:
      - author: report author name
      - filename: output filename (default: report_<timestamp>.pdf)
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    title = payload.get("title", "Report")
    sections = payload.get("sections", [])
    author = payload.get("author", "TaskFlow System")
    filename = payload.get("filename", f"report_{int(time.time())}.pdf")

    # Ensure reports directory exists
    os.makedirs("/app/reports", exist_ok=True)
    filepath = f"/app/reports/{filename}"

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=24,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.grey,
        spaceAfter=20,
        alignment=TA_CENTER,
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#16213e"),
        spaceBefore=16,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#333333"),
    )

    story = []

    # Title
    story.append(Paragraph(title, title_style))
    story.append(Paragraph(
        f"Generated by {author} on {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e0e0e0")))
    story.append(Spacer(1, 0.2 * inch))

    # Sections
    if not sections:
        sections = [{"heading": "Summary", "content": "No content provided."}]

    for section in sections:
        heading = section.get("heading", "Section")
        content = section.get("content", "")
        story.append(Paragraph(heading, heading_style))
        story.append(Paragraph(content, body_style))
        story.append(Spacer(1, 0.1 * inch))

    # Footer note
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e0e0e0")))
    story.append(Paragraph(
        "Generated by TaskFlow Distributed Task Queue System",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.grey, alignment=TA_CENTER, spaceBefore=6)
    ))

    doc.build(story)

    file_size = os.path.getsize(filepath)

    return {
        "generated": True,
        "filename": filename,
        "filepath": filepath,
        "file_size_bytes": file_size,
        "title": title,
        "sections_count": len(sections),
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─── Main Task Executor ───────────────────────────────────────────────────────

@app.task(bind=True, name="execute_task", max_retries=None)
def execute_task(self, task_id: str):
    from models import Task, TaskStatus

    db = get_sync_db()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            logger.error(f"Task {task_id} not found")
            return

        if task.status == TaskStatus.CANCELLED:
            logger.info(f"Task {task_id} was cancelled, skipping")
            return

        # Mark as running
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.utcnow()
        db.commit()

        payload = json.loads(task.payload) if task.payload else {}

        # ── Route to real task handler ──
        if task.task_type == "send_email":
            result = run_send_email(payload)

        elif task.task_type == "scrape_webpage":
            result = run_scrape_webpage(payload)

        elif task.task_type == "generate_report":
            result = run_generate_pdf(payload)

        else:
            # Fallback: simulate work for unknown task types
            duration = random.uniform(1, 4)
            time.sleep(duration)
            if random.random() < 0.15:
                raise Exception(f"Simulated failure in '{task.task_type}'")
            result = {
                "processed": True,
                "task_type": task.task_type,
                "duration_seconds": round(duration, 2),
                "note": "Simulated task — add real implementation in tasks.py",
            }

        # Success
        task.status = TaskStatus.SUCCESS
        task.result = json.dumps(result)
        task.completed_at = datetime.utcnow()
        db.commit()
        logger.info(f"Task {task_id} ({task.task_type}) completed successfully")

    except Exception as exc:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.retry_count += 1
            if task.retry_count <= task.max_retries:
                backoff = (2 ** task.retry_count) * 10
                task.status = TaskStatus.RETRYING
                task.error = str(exc)
                db.commit()
                logger.warning(f"Task {task_id} failed, retrying in {backoff}s (attempt {task.retry_count}/{task.max_retries})")
                raise self.retry(exc=exc, countdown=backoff)
            else:
                task.status = TaskStatus.FAILED
                task.error = str(exc)
                task.completed_at = datetime.utcnow()
                db.commit()
                logger.error(f"Task {task_id} permanently failed: {exc}")
    finally:
        db.close()