# ChangeStudent - WHS Class Change Workflow

This project provides a simple workflow system for moving a student from one class to another while tracking each step and notifying the right people.

## Features

- Submit class change requests.
- Approve requests in sequence (Dean then Timetabler).
- Reject requests with notes.
- Complete approved requests and update student class assignment.
- Capture full audit log and process timeline.
- Record notification events for accountability.

## Workflow States

- `REQUESTED`
- `DEAN_APPROVED`
- `TIMETABLER_APPROVED`
- `REJECTED`
- `COMPLETED`

## Quick Start

1. Install dependencies:
   - `npm install`
2. Start the app:
   - `npm run dev`
3. Open:
   - `http://localhost:3000`

The database is SQLite and stored in `data/changestudent.db`.

## Notification Setup (Optional)

Email notifications are simulated by default unless SMTP settings are provided.

Copy `.env.example` to `.env` and set:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## API Summary

- `GET /api/students`
- `GET /api/requests`
- `POST /api/requests`
- `POST /api/requests/:id/approve`
- `POST /api/requests/:id/reject`
- `POST /api/requests/:id/complete`
- `GET /api/requests/:id/timeline`
