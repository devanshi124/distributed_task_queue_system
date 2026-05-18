# Distributed Task Queue System

A production-style backend platform for managing asynchronous background tasks using FastAPI, Celery, Redis, PostgreSQL, Docker, and a React dashboard.

This system handles long-running tasks like email sending, web scraping, and PDF report generation without blocking the main application, while providing real-time monitoring and task tracking.



## Features

- Asynchronous background task execution
- Priority-based task queues (High / Medium / Low)
- Automatic retries with exponential backoff
- Task cancellation support
- Real-time task status updates using WebSockets
- Redis as message broker
- PostgreSQL for persistent task storage
- Flower dashboard for Celery monitoring
- React + Vite frontend dashboard for live monitoring
- Dockerized multi-service architecture



## Tech Stack

### Backend
- FastAPI
- Celery
- Redis
- PostgreSQL
- SQLAlchemy
- WebSockets
- SMTP (Email Sending)
- BeautifulSoup (Web Scraping)
- ReportLab (PDF Generation)

### Frontend
- React
- Vite
- Tailwind CSS
- Recharts

### DevOps
- Docker
- Docker Compose


## Supported Tasks

### Send Email
Sends real emails using Gmail SMTP.

### Scrape Webpage
Extracts title, headings, links, and metadata using BeautifulSoup.

### Generate PDF Report
Creates structured PDF reports using ReportLab.

---

## Project Structure

```text
Distributed_Task_Queue_System/
│
├── api/            # FastAPI backend
├── workers/        # Celery workers
├── dashboard/      # React frontend dashboard
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
