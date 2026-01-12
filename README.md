# BroadcastChannel API POC

Inter-tab communication without cookies or localStorage.

## Quick Start

```bash
# Start a local server (pick one)
npx serve .
# or
python3 -m http.server 3000

# Open http://localhost:3000 (or :8000 for Python)
```

> ES modules require a server. Opening HTML files directly (`file://`) won't work.

---

## What is BroadcastChannel?

A browser API for real-time communication between tabs/windows on the **same origin**.

```javascript
// Create or join a channel
const channel = new BroadcastChannel("my-channel");

// Send to all subscribers
channel.postMessage({ type: "hello", data: "world" });

// Receive messages
channel.onmessage = (event) => console.log(event.data);

// Disconnect
channel.close();
```

### Key Points

- Works within a **single browser** (not across users/machines)
- Same-origin only (same protocol + domain + port)
- No persistent storage - data stays in memory
- Automatic cleanup when tabs close

---

## Project Structure

```
broadcast-channel-api-poc/
├── index.html      # Controller page
├── session.html    # Child session page
├── controller.js   # Controller logic
├── session.js      # Session logic
├── utils.js        # Shared utilities
├── styles.css      # Styling
└── README.md
```

---

## How It Works

### 1. Controller launches sessions

```javascript
window.open(`session.html?sessionId=Session-1&data=custom`, "_blank");
```

### 2. Session registers with controller

```javascript
channel.postMessage({
	type: "session-registered",
	sessionId: "Session-1",
	data: "custom",
});
```

### 3. Two-way communication

- **Broadcast**: Controller sends to all sessions
- **Direct**: Controller targets a specific session (filtered by `targetSession`)
- **Reply**: Sessions send messages back to controller

### 4. Cleanup on close

```javascript
window.addEventListener("beforeunload", () => {
	channel.postMessage({ type: "session-closed", sessionId });
	channel.close();
});
```

---

## Message Types

### Controller → Sessions

| Type                 | Description              |
| -------------------- | ------------------------ |
| `broadcast`          | Message to all sessions  |
| `direct-message`     | Message to one session   |
| `close-session`      | Request session to close |
| `close-all`          | Close all sessions       |
| `controller-closing` | Controller is closing    |

### Sessions → Controller

| Type                | Description               |
| ------------------- | ------------------------- |
| `session-registered`| Session announcing itself |
| `session-closed`    | Session is closing        |
| `session-message`   | Message from session      |
| `session-ping`      | Heartbeat (optional)      |

---

## Browser Support

| Browser | Version |
| ------- | ------- |
| Chrome  | 54+     |
| Firefox | 38+     |
| Edge    | 79+     |
| Safari  | 15.4+   |

Baseline support across all major browsers since March 2022.

---

## Limitations

1. **Single browser only** - Cannot communicate across users/machines
2. **Same-origin only** - Different domains can't communicate
3. **No persistence** - Messages are ephemeral
4. **No ordering guarantee** - Usually preserved, but not guaranteed

---

## References

- [MDN: BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
