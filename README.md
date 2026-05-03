# Global Checkbox

A real-time collaborative checkbox grid where users from around the world can interact with 1,000,000 checkboxes simultaneously. Built with WebSockets, Redis pub/sub, and SagarAuth authentication.

## Project Overview

Global Checkbox is a real-time web application that demonstrates distributed state management and live synchronization across multiple clients. Users can toggle checkboxes in a shared grid, with changes instantly reflected for all connected users worldwide. The application handles concurrent updates, rate limiting, and user authentication seamlessly.

## Tech Stack

### Backend
- **Node.js** with **Express** - HTTP server and API endpoints
- **Socket.IO** - Real-time bidirectional WebSocket communication
- **Redis (ioredis)** - State persistence and pub/sub messaging
- **TypeScript** - Type-safe development

### Frontend
- **Vanilla JavaScript** - Lightweight client-side logic
- **Socket.IO Client** - WebSocket connection management
- **SagarAuth** - OAuth 2.0 authentication provider

### Infrastructure
- **Redis Pub/Sub** - Multi-instance synchronization
- **Cookie-based sessions** - Authentication token storage

## Features Implemented

### Core Features
- ✅ **1,000,000 checkbox grid** - Massive shared state management
- ✅ **Real-time synchronization** - Instant updates across all connected clients
- ✅ **Multi-instance support** - Redis pub/sub enables horizontal scaling
- ✅ **Live user count** - Track concurrent users in real-time
- ✅ **Checkbox statistics** - Display checked/unchecked counts

### Authentication & Security
- ✅ **SagarAuth OAuth integration** - Secure third-party authentication
- ✅ **Protected interactions** - Only authenticated users can toggle checkboxes
- ✅ **Token-based sessions** - Access and refresh token management
- ✅ **User profile drawer** - Display user info and logout functionality

### Performance & UX
- ✅ **Rate limiting** - Prevent spam (2-second cooldown per user)
- ✅ **Optimistic UI updates** - Instant visual feedback
- ✅ **Loading states** - Smooth transitions and loading indicators
- ✅ **Toast notifications** - User feedback for actions and errors
- ✅ **Responsive design** - Mobile and desktop support

## How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- Redis server running locally
- pnpm package manager

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd global-checkbox-redis
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure:
```env
PORT=3000
```

4. **Start Redis server**
```bash
redis-server
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

5. **Build and run the application**

For development (with hot reload):
```bash
pnpm dev
```

For production:
```bash
pnpm build
pnpm start
```

6. **Access the application**

Open your browser and navigate to:
```
http://localhost:3000
```

## Environment Variables Required

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | HTTP server port | `3000` | No |

**Note:** SagarAuth credentials are hardcoded in the frontend for this demo. In production, these should be environment variables.

## Redis Setup Instructions

### Local Development

1. **Install Redis**

On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install redis-server
```

On macOS:
```bash
brew install redis
```

2. **Start Redis**
```bash
redis-server
```

3. **Verify connection**
```bash
redis-cli ping
```

### Redis Configuration

The application uses three Redis connections:
- **Publisher** - Publishes state changes to other instances
- **Subscriber** - Listens for state changes from other instances
- **Main client** - Reads/writes application state

Default connection settings ([src/redis-connection.ts](src/redis-connection.ts)):
```typescript
{
  host: "localhost",
  port: 6379
}
```

### Redis Keys Used

| Key | Type | Description |
|-----|------|-------------|
| `checkbox-state` | String (JSON) | Serialized array of 1M boolean values |
| `user-count` | String | Current number of connected users |

### Production Considerations

For production deployments, update [src/redis-connection.ts](src/redis-connection.ts) to use:
- Redis connection URL from environment variables
- TLS/SSL encryption
- Authentication credentials
- Connection pooling
- Retry strategies

## Auth Flow Explanation

The application uses **SagarAuth**, a custom OAuth 2.0 provider, for authentication.

### Authentication Flow

```
┌─────────┐                ┌──────────────┐                ┌────────────┐
│ Browser │                │ Application  │                │ SagarAuth  │
└────┬────┘                └──────┬───────┘                └─────┬──────┘
     │                            │                              │
     │  1. Click "Sign in"        │                              │
     ├───────────────────────────>│                              │
     │                            │                              │
     │  2. Redirect to SagarAuth  │                              │
     ├────────────────────────────┼─────────────────────────────>│
     │                            │                              │
     │  3. User authenticates     │                              │
     │                            │                              │
     │  4. Redirect with code     │                              │
     │<───────────────────────────┼──────────────────────────────┤
     │                            │                              │
     │  5. Exchange code for tokens                              │
     ├───────────────────────────>│──────────────────────────────>│
     │                            │                              │
     │  6. Return access + refresh tokens                        │
     │<───────────────────────────┤<─────────────────────────────┤
     │                            │                              │
     │  7. Fetch user info        │                              │
     ├───────────────────────────>│──────────────────────────────>│
     │                            │                              │
     │  8. Return user profile    │                              │
     │<───────────────────────────┤<─────────────────────────────┤
     │                            │                              │
     │  9. Store tokens & profile │                              │
     │    (cookies + localStorage)│                              │
     │                            │                              │
```

### Implementation Details

**1. Login Initiation** ([public/index.html](public/index.html):1189-1193)
```javascript
const LOGIN_URL = `${SAGAR_AUTH_BASE}/auth/login?clientId=${CLIENT_ID}`;
// Redirects user to SagarAuth login page
window.location.href = LOGIN_URL;
```

**2. OAuth Callback** ([public/index.html](public/index.html):1212-1261)
- User returns with authorization code in URL hash: `#login?code=...`
- Application exchanges code for tokens via `/auth/token` endpoint
- Tokens stored in cookies (7-day expiry)

**3. Token Storage**
- `access_token` - Cookie (7 days, SameSite=Lax)
- `refresh_token` - Cookie (7 days, SameSite=Lax)
- User profile - localStorage as JSON

**4. Protected Actions** ([public/index.html](public/index.html):1365-1384)
```javascript
// Before allowing checkbox toggle
if (!isLoggedIn()) {
  openModal(true); // Force login
  return;
}
```

**5. Logout** ([public/index.html](public/index.html):1198-1207)
- Delete cookies
- Clear localStorage
- Update UI to logged-out state

### SagarAuth Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | GET | Initiate OAuth flow |
| `/auth/token` | POST | Exchange code for tokens |
| `/auth/userinfo` | GET | Fetch user profile |

## WebSocket Flow Explanation

The application uses Socket.IO for real-time bidirectional communication between clients and server.

### Connection Flow

```
┌─────────┐                    ┌──────────┐                    ┌─────────┐
│ Client  │                    │  Server  │                    │  Redis  │
└────┬────┘                    └─────┬────┘                    └────┬────┘
     │                              │                              │
     │  1. Connect via Socket.IO    │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │                              │  2. Increment user count     │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │  3. Get checkbox state       │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │  4. Send initial state       │                              │
     │<─────────────────────────────┤                              │
     │   (onConnect event)          │                              │
     │                              │                              │
     │                              │  5. Publish user count       │
     │                              ├─────────────────────────────>│
     │                              │     (pub/sub channel)        │
     │                              │                              │
     │  6. Broadcast user count     │                              │
     │<─────────────────────────────┤                              │
     │   (to all clients)           │                              │
     │                              │                              │
```

### Checkbox Update Flow

```
┌─────────┐         ┌──────────┐         ┌─────────┐         ┌─────────┐
│ Client A│         │  Server  │         │  Redis  │         │ Client B│
└────┬────┘         └─────┬────┘         └────┬────┘         └────┬────┘
     │                    │                    │                    │
     │  1. Toggle checkbox│                    │                    │
     ├───────────────────>│                    │                    │
     │  (checkboxChange)  │                    │                    │
     │                    │                    │                    │
     │                    │  2. Rate limit check                    │
     │                    │     (2s cooldown)  │                    │
     │                    │                    │                    │
     │                    │  3. Validate index │                    │
     │                    │                    │                    │
     │                    │  4. Update state   │                    │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │  5. Publish change │                    │
     │                    ├───────────────────>│                    │
     │                    │  (pub/sub channel) │                    │
     │                    │                    │                    │
     │                    │  6. Subscriber receives                 │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │  7. Broadcast to all clients            │                    │
     │<───────────────────┤                    │                    │
     │                    ├────────────────────┼───────────────────>│
     │                    │                    │                    │
```

### Socket Events

#### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `onConnect` | `boolean[]` | Initial checkbox state (1M array) |
| `userCount` | `string` | Current number of connected users |
| `checkboxChange` | `{index, state}` | Checkbox state change notification |
| `error` | `{message}` | Error message (e.g., invalid index) |
| `server:rateLimitExceeded` | `{message}` | Rate limit violation notification |

#### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `checkboxChange` | `{index, state}` | User toggled a checkbox |
| `disconnect` | - | Client disconnected (automatic) |

### Implementation Details

**1. Connection Handler** ([src/index.ts](src/index.ts):63-97)
```typescript
io.on("connection", async (socket) => {
  connectedUser++;
  socket.emit("onConnect", checkBoxState);
  await redis.set(USER_COUNT_KEY, String(connectedUser));
  publisher.publish("internal-server:userCount", String(connectedUser));
  // ... event handlers
});
```

**2. Checkbox Change Handler** ([src/index.ts](src/index.ts):68-91)
- Validates checkbox index (0 to 999,999)
- Applies rate limiting (2-second cooldown)
- Updates Redis state
- Publishes change to pub/sub channel

**3. Redis Pub/Sub Subscriber** ([src/index.ts](src/index.ts):99-107)
```typescript
subscriber.on("message", (channel, message) => {
  if (channel === "internal-server:checkbox-state-change") {
    io.emit("checkboxChange", message); // Broadcast to all clients
  }
  if (channel === "internal-server:userCount") {
    io.emit("userCount", message);
  }
});
```

**4. Client-Side Handler** ([public/index.html](public/index.html):1319-1326)
```javascript
socket.on("checkboxChange", (data) => {
  const { index, state } = JSON.parse(data);
  checkboxRefs[index].checked = state; // Update UI
  checkBoxStateArr[index] = state;
  updateCheckboxCounts();
});
```

### Multi-Instance Architecture

The Redis pub/sub pattern enables horizontal scaling:

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │     │ Client  │     │ Client  │
└────┬────┘     └────┬────┘     └────┬────┘
     │               │               │
     ├───────────────┼───────────────┤
     │               │               │
┌────▼────┐     ┌────▼────┐     ┌────▼────┐
│ Server  │     │ Server  │     │ Server  │
│Instance1│     │Instance2│     │Instance3│
└────┬────┘     └────┬────┘     └────┬────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
                ┌────▼────┐
                │  Redis  │
                │ Pub/Sub │
                └─────────┘
```

Each server instance:
1. Maintains its own Socket.IO connections
2. Publishes changes to Redis
3. Subscribes to changes from other instances
4. Broadcasts received changes to its connected clients

## Rate Limiting Logic Explanation

The application implements per-user rate limiting to prevent spam and ensure fair usage.

### Rate Limiting Strategy

**Approach:** Token bucket with 2-second cooldown per user

**Implementation:** In-memory HashMap tracking last operation timestamp per socket

### How It Works

**1. Data Structure** ([src/index.ts](src/index.ts):47)
```typescript
let rateLimitingHashMap = new Map<string, number>();
// Key: socket.id (unique per connection)
// Value: timestamp of last operation (milliseconds)
```

**2. Rate Limit Check** ([src/index.ts](src/index.ts):71-79)
```typescript
const lastOperationTime = rateLimitingHashMap.get(socket.id);
if (lastOperationTime) {
  const timeElapsed = Date.now() - lastOperationTime;
  if (timeElapsed < 2 * 1000) { // 2 seconds
    return socket.emit("server:rateLimitExceeded", {
      message: `Rate limit exceeded. Please wait.`,
    });
  }
}
rateLimitingHashMap.set(socket.id, Date.now());
```

**3. Client-Side Feedback** ([public/index.html](public/index.html):1332-1334)
```javascript
socket.on("server:rateLimitExceeded", () => {
  showToast("Slow down! ");
});
```

### Rate Limit Parameters

| Parameter | Value | Reason |
|-----------|-------|--------|
| **Cooldown** | 2 seconds | Prevents rapid clicking while allowing responsive interaction |
| **Scope** | Per socket | Each user connection has independent rate limit |
| **Storage** | In-memory Map | Fast lookups, automatic cleanup on disconnect |

### Flow Diagram

```
User clicks checkbox
        │
        ▼
Check rate limit map
        │
        ├─── Last click < 2s ago?
        │           │
        │           ├─── YES → Reject + Send error
        │           │              │
        │           │              ▼
        │           │         Show toast: "Slow down!"
        │           │
        │           └─── NO → Continue
        │                      │
        ▼                      ▼
Update timestamp ──────> Process checkbox change
        │
        ▼
Update Redis
        │
        ▼
Broadcast to all clients
```

### Limitations & Considerations

**Current Implementation:**
- ✅ Simple and fast (O(1) lookups)
- ✅ Per-user fairness
- ✅ No external dependencies
- ⚠️ In-memory only (resets on server restart)
- ⚠️ Not shared across server instances

**Production Improvements:**
- Use Redis for distributed rate limiting
- Implement sliding window algorithm
- Add configurable rate limits per user tier
- Track rate limit violations for abuse detection

### Why 2 Seconds?

The 2-second cooldown balances:
- **User experience** - Feels responsive, not restrictive
- **Server load** - Limits each user to max 30 operations/minute
- **Network efficiency** - Reduces unnecessary WebSocket traffic
- **Abuse prevention** - Stops automated rapid-fire scripts

With 1,000 concurrent users, max throughput = 500 updates/second, well within Socket.IO and Redis capabilities.

---

## Project Structure

```
global-checkbox-redis/
├── src/
│   ├── index.ts              # Main server file
│   └── redis-connection.ts   # Redis client setup
├── public/
│   ├── index.html            # Frontend (HTML + CSS + JS)
│   └── logo.png              # Application logo
├── dist/                     # Compiled TypeScript output
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serve main application HTML |
| `/health` | GET | Health check endpoint |
| `/socket.io/` | WebSocket | Socket.IO connection endpoint |

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Test thoroughly
5. Submit a pull request

## License

ISC

## Author

Sagar Kemble

## Live Demo

🌐 [https://one0-000-global-checkbox.onrender.com/](https://one0-000-global-checkbox.onrender.com/)

---

**Built with ❤️ using Node.js, Socket.IO, and Redis**
