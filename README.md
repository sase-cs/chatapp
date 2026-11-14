# Threadline

A full-stack real-time chat app built with the MERN stack. Add friends by username, chat one-to-one with photos, videos, audio files and voice notes, reply in threads, and make the app your own with themes and chat backgrounds.

## Features

- **Threaded replies**: reply to any message. Replies show inline in the chat, joined to the original by a thread line in the margin, and open a thread view where the original message flies up to the top (no quoted preview bubble).
- **Friends, Discord-style**: send requests by username, accept or ignore incoming ones, cancel sent ones. Only friends can message each other. Online / All / Pending / Add Friend tabs with live search.
- **Real-time** with Socket.IO: new messages, typing indicators (including inside threads), online status, "Seen" receipts, unread badges and live friend-request updates. Socket connections are authenticated with the Clerk session token.
- **Media**: photos, videos and audio files up to 25 MB on [ImageKit](https://imagekit.io), with upload progress and a full-screen viewer. Voice notes are recorded in the browser with a live waveform, which is saved with the message.
- **Themes**: light, dark or system mode, 11 accent colors, gradient or solid bubbles, and 7 chat backgrounds drawn in the accent color, or your own image with a dim slider. Backgrounds can also be set per chat. Everything is saved to the account in MongoDB.
- **Profiles**: profile cards with bio, member-since date and mutual friends, a profile side panel with shared media in chats, and a bio editor.
- **Polish**: animated page, tab and sidebar transitions, a minimal send animation, a Ctrl+K quick switcher, optimistic sending with retry, paginated history and a mobile layout. Animations respect the OS "reduce motion" setting.
- **Authentication** with [Clerk](https://clerk.com). Users sync to MongoDB through signed webhooks, with a fallback that pulls the user from Clerk on first request.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19 (React Compiler), Vite, Tailwind CSS 4, HeroUI v3, Motion, Zustand, React Router, Socket.IO client, Clerk React |
| Backend | Node.js, Express 5, Mongoose, Socket.IO, Multer |
| Database | MongoDB |
| Services | Clerk (auth), ImageKit (media storage) |
| Deployment | Docker, Render |

## Project structure

```
chatapp/
├── backend/
│   └── src/
│       ├── controllers/   # auth, user, friend and message handlers
│       ├── lib/           # MongoDB connection, ImageKit client, cron job
│       ├── middleware/    # route protection, file upload
│       ├── models/        # User, Message and FriendRequest schemas
│       ├── routes/        # /api/auth, /api/users, /api/friends, /api/messages
│       ├── webhooks/      # Clerk webhook handler
│       └── index.js       # Express app entry point
├── frontend/              # React + Vite client
└── Dockerfile             # multi-stage build (frontend + backend)
```

## API

All routes except `/health` and the webhook require a signed-in user.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/api/users/me` | The signed-in user, including appearance preferences |
| PATCH | `/api/users/me` | Update bio |
| PATCH | `/api/users/me/preferences` | Update theme, accent, bubbles, background (global or per chat) |
| POST | `/api/users/me/background` | Upload a custom chat background (`image`) |
| GET | `/api/users/search?q=` | Find people by username, name or exact email |
| GET | `/api/users/:id` | Public profile, relationship and mutual friends |
| GET | `/api/friends` | Friend list |
| GET | `/api/friends/requests` | Incoming and outgoing requests |
| POST | `/api/friends/requests` | Send a request (`username` or `userId`) |
| POST | `/api/friends/requests/:id/accept` | Accept a request |
| POST | `/api/friends/requests/:id/decline` | Ignore a request |
| DELETE | `/api/friends/requests/:id` | Cancel a sent request |
| DELETE | `/api/friends/:userId` | Remove a friend |
| GET | `/api/messages/conversations` | Conversations with last message and unread count |
| GET | `/api/messages/:id?before=` | Message history with user `:id`, 50 at a time |
| GET | `/api/messages/thread/:messageId` | A thread: root message and replies |
| POST | `/api/messages/send/:id` | Send `text` and/or `media`, optional `parentId` to reply in a thread |
| PATCH | `/api/messages/:id/seen` | Mark messages from user `:id` as seen |
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

In development Vite proxies `/api` and `/socket.io` to the backend on port 3000, so no CORS setup is needed.

To try the chat with a single account, `npm run seed:demo` (in `backend/`) adds two demo friends with a sample conversation and thread to your dev database; `npm run seed:demo -- --remove` deletes them again.

### Run with Docker

```bash
docker build --build-arg VITE_CLERK_PUBLISHABLE_KEY=your_key -t chatapp .
docker run -p 3001:3001 --env-file backend/.env chatapp
```

## Roadmap

- [x] Clerk authentication and webhook user sync
- [x] Messaging REST API with media uploads
- [x] Chat interface in React (sidebar, conversation view, composer)
- [x] Real-time messaging, typing indicators and online status with Socket.IO
- [x] Friend requests
- [x] Threaded replies
- [x] Read receipts and unread counts
- [x] Themes and chat backgrounds
- [x] Voice notes
- [ ] Message reactions
- [ ] Editing and deleting messages
- [ ] Group chats

## Author

Andrei Claudiu Sasebeș · [GitHub](https://github.com/sase-cs)
