# ChatApp

A full-stack one-to-one chat application built with the MERN stack. Users sign in with Clerk, browse other users, see their recent conversations and exchange text messages with image or video attachments.

> **Status: work in progress.** The backend API is functional; the React chat interface and real-time delivery with Socket.io are under development.

## Features

- **Authentication** with [Clerk](https://clerk.com), with users synced to MongoDB through signed Clerk webhooks (`user.created`, `user.updated`, `user.deleted`)
- **Protected REST API**: every message route checks the Clerk session and loads the matching user from the database
- **One-to-one messaging**: send and fetch the message history between two users, sorted chronologically
- **Media attachments**: images and videos up to 25 MB, received with Multer and stored on [ImageKit](https://imagekit.io)
- **Conversation list**: a MongoDB aggregation pipeline groups messages by the other participant and sorts conversations by the latest message
- **Single-container deployment**: a multi-stage Dockerfile builds the Vite frontend and serves it from the Express server
- **Keep-alive job**: a cron job pings `/health` every 14 minutes so the free Render instance does not sleep

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, Clerk React |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB |
| Services | Clerk (auth), ImageKit (media storage) |
| Deployment | Docker, Render |

## Project structure

```
chatapp/
├── backend/
│   └── src/
│       ├── controllers/   # auth and message handlers
│       ├── lib/           # MongoDB connection, ImageKit client, cron job
│       ├── middleware/    # route protection, file upload
│       ├── models/        # User and Message schemas
│       ├── routes/        # /api/auth, /api/messages
│       ├── webhooks/      # Clerk webhook handler
│       └── index.js       # Express app entry point
├── frontend/              # React + Vite client
└── Dockerfile             # multi-stage build (frontend + backend)
```

## API

All `/api/messages` routes require a signed-in user.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/api/auth/check` | Returns the signed-in user |
| GET | `/api/messages/users` | All users except the signed-in one |
| GET | `/api/messages/conversations` | Users you have chatted with, newest first |
| GET | `/api/messages/:id` | Message history with user `:id` |
| POST | `/api/messages/send/:id` | Send a message to user `:id` (`text` and/or a `media` file) |
| POST | `/api/webhooks/clerk` | Clerk webhook endpoint for user sync |

## Getting started

### Prerequisites

- Node.js 22+
- A MongoDB database (for example MongoDB Atlas)
- A Clerk application and an ImageKit account

### Environment variables

`backend/.env`

```
PORT=3001
MONGO_URI=your_mongodb_connection_string
FRONTEND_URL=http://localhost:5173
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SIGNING_SECRET=your_clerk_webhook_secret
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

`frontend/.env`

```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

### Run locally

```bash
# backend
cd backend
npm install
npm run dev

# frontend (in a second terminal)
cd frontend
npm install
npm run dev
```

### Run with Docker

```bash
docker build --build-arg VITE_CLERK_PUBLISHABLE_KEY=your_key -t chatapp .
docker run -p 3001:3001 --env-file backend/.env chatapp
```

## Roadmap

- [x] Clerk authentication and webhook user sync
- [x] Messaging REST API with media uploads
- [x] Conversation list via aggregation pipeline
- [x] Docker build and Render deployment setup
- [ ] Chat interface in React (sidebar, conversation view, message input)
- [ ] Real-time messaging and online status with Socket.io
- [ ] Message read receipts

## Author

Andrei Claudiu Sasebeș · [GitHub](https://github.com/sase-cs)
