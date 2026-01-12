# BroadcastChannel API - Proof of Concept

## Overview

This POC demonstrates how the **BroadcastChannel API** can be used to enable communication between multiple DP2 sessions launched from E1, **without requiring cookies, localStorage, or sessionStorage**.

### The Problem

> "Ability to launch multiple DP2 sessions from within E1 - we did not come up with a simple solution for this."

### The Solution

The BroadcastChannel API provides a simple, elegant solution for inter-tab communication within the same origin.

---

## Important: What BroadcastChannel Does NOT Do

**BroadcastChannel only works within a SINGLE user's browser.** It cannot communicate across different users, machines, or browsers.

### Scope Diagram

```
BroadcastChannel (client-side only - SINGLE USER):
┌─────────────────────────────────────────────────┐
│  User A's Browser (on User A's computer)        │
│  ┌─────┐    ┌─────┐    ┌─────┐                  │
│  │ E1  │◄──►│ DP2 │◄──►│ DP2 │  ✅ Works        │
│  └─────┘    └─────┘    └─────┘                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  User B's Browser (on User B's computer)        │
│  ┌─────┐    ┌─────┐                             │
│  │ E1  │◄──►│ DP2 │  ✅ Works (within User B)   │
│  └─────┘    └─────┘                             │
└─────────────────────────────────────────────────┘

     User A  ◄─ ─ ─ ─ ─ ─ ─►  User B
                   ❌
          NO CONNECTION POSSIBLE
      (BroadcastChannel cannot do this)
```

### What Works vs. What Doesn't

| Scenario                                              | Works? |
| ----------------------------------------------------- | ------ |
| Same user, same browser, multiple tabs                | ✅ Yes |
| Same user, same browser profile                       | ✅ Yes |
| Same computer, different browsers (Chrome vs Firefox) | ❌ No  |
| Same computer, different browser profiles             | ❌ No  |
| Different computers, same user                        | ❌ No  |
| Different users on different computers                | ❌ No  |

### Common Misconception

**If the goal is to prevent multiple USERS from editing the same record simultaneously**, BroadcastChannel is NOT the solution. That requires server-side coordination:

| Solution                | Description                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Pessimistic Locking** | Lock record in database when User A opens it; User B sees "Record locked by User A" |
| **Optimistic Locking**  | Allow edits, check version/timestamp on save; reject if another user modified it    |
| **WebSockets**          | Real-time server push to notify ALL users of changes across machines                |
| **Server-Sent Events**  | Server pushes updates to all connected clients                                      |

### What This POC Actually Solves

This POC addresses the original request from the email:

> "Ability to launch multiple DP2 sessions from within E1"

This is a **single-user, multi-tab** problem - one person opening multiple DP2 windows from their E1 instance and coordinating between them. BroadcastChannel is perfect for this.

---

## How BroadcastChannel API Works

### Key Concepts

1. **Channel Creation**

    ```javascript
    const channel = new BroadcastChannel("my-channel-name");
    ```

    - Creates or joins a channel with the specified name
    - All contexts (tabs/windows) using the same channel name can communicate
    - No server required - communication happens entirely in the browser

2. **Sending Messages**

    ```javascript
    channel.postMessage({
    	type: "UPDATE",
    	data: { leadId: "LEAD-123", an8: "87654321" },
    });
    ```

    - Messages are sent to **all** subscribers of the channel
    - Uses the [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) - can send objects, arrays, not just strings

3. **Receiving Messages**

    ```javascript
    channel.onmessage = (event) => {
    	console.log(event.data);
    };
    ```

    - All subscribers receive the message (except the sender)
    - Message data is in `event.data`

4. **Closing the Channel**
    ```javascript
    channel.close();
    ```
    - Disconnects from the channel
    - Resources are garbage collected automatically

---

## Why BroadcastChannel is Ideal for This Use Case

| Feature                   | Benefit                                             |
| ------------------------- | --------------------------------------------------- |
| **No persistent storage** | Data stays in memory only - nothing written to disk |
| **No cookies**            | No need to manage cookie expiration or size limits  |
| **Automatic cleanup**     | When tab closes, channel subscription is removed    |
| **Same-origin security**  | Communication restricted to same origin (secure)    |
| **Real-time**             | Messages delivered instantly to all subscribers     |
| **Simple API**            | Easy to implement and maintain                      |

---

## POC Structure

```
boradcast-channel-api-poc/
├── index.html        # E1 Simulator (main controller)
├── dp2-session.html  # DP2 Session (child window)
├── styles.css        # Shared styles
└── README.md         # This file
```

---

## How to Run the POC

You need to serve the files via a local web server. Opening the HTML files directly (`file://`) may not work due to browser security restrictions.

### Quick Start (Requires Node.js)

```bash
# 1. Open Terminal and navigate to the project folder
cd ~/Desktop/boradcast-channel-api-poc

# 2. Start a local server using npx (no installation required)
npx http-server -p 8080

# 3. Open your browser and go to:
#    http://localhost:8080
```

### Stopping the Server

Press `Ctrl + C` in the terminal to stop the server.

---

## POC Demonstration

### Step 1: Open E1 Simulator

-   Start the local server (see above)
-   Open http://localhost:8080 in your browser
-   You'll see the "E1 Simulator" page

### Step 2: Launch DP2 Sessions

-   Enter a Lead ID and AN8 (or leave blank for auto-generated values)
-   Click "Launch New DP2 Session"
-   A new tab opens with the DP2 session
-   **Repeat this to open multiple DP2 sessions**

### Step 3: Test Communication

-   **From E1:** Type a message and click "Broadcast Message" - all DP2 tabs receive it
-   **From E1:** Click "Send Message" on a specific session - only that tab receives it
-   **From DP2:** Type a message and click "Send to E1" - the E1 tab receives it
-   Watch the communication logs update in real-time on all tabs

### Step 4: Test Session Management

-   Close a specific session from E1 using the "Close" button
-   Close all sessions at once using "Close All Sessions"
-   Close a DP2 tab directly - E1 automatically detects it's gone

---

## Message Protocol

The POC implements a simple message protocol:

### Messages from E1 to DP2

| Type             | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `BROADCAST`      | Message to all sessions                                   |
| `DIRECT_MESSAGE` | Message to specific session (filtered by `targetSession`) |
| `CLOSE_SESSION`  | Request specific session to close                         |
| `CLOSE_ALL`      | Request all sessions to close                             |
| `E1_CLOSING`     | Notify sessions that E1 is closing                        |

### Messages from DP2 to E1

| Type                 | Description                     |
| -------------------- | ------------------------------- |
| `SESSION_REGISTERED` | New session announcing itself   |
| `SESSION_CLOSED`     | Session announcing it's closing |
| `SESSION_MESSAGE`    | General message from session    |
| `SESSION_PING`       | Heartbeat (optional)            |

---

## Implementation Notes

### Targeted Messages

BroadcastChannel sends to ALL subscribers. For targeted messages, include a filter:

```javascript
// Sender (E1)
channel.postMessage({
	type: "DIRECT_MESSAGE",
	targetSession: "DP2-123",
	message: "Hello specific session",
});

// Receiver (DP2)
channel.onmessage = (event) => {
	if (event.data.targetSession === mySessionId) {
		// This message is for me
	}
};
```

### Session Tracking

E1 maintains a Map of active sessions:

```javascript
const activeSessions = new Map();

channel.onmessage = (event) => {
	if (event.data.type === "SESSION_REGISTERED") {
		activeSessions.set(event.data.sessionId, {
			leadId: event.data.leadId,
			an8: event.data.an8,
		});
	}
	if (event.data.type === "SESSION_CLOSED") {
		activeSessions.delete(event.data.sessionId);
	}
};
```

### Cleanup

Always notify others when closing:

```javascript
window.addEventListener("beforeunload", () => {
	channel.postMessage({ type: "SESSION_CLOSED", sessionId });
	channel.close();
});
```

---

## Browser Compatibility

| Browser | Support |
| ------- | ------- |
| Chrome  | 54+     |
| Firefox | 38+     |
| Edge    | 79+     |
| Safari  | 15.4+   |
| Opera   | 41+     |

**Note:** BroadcastChannel has been baseline supported across all major browsers since **March 2022**.

---

## Limitations & Considerations

1. **Single Browser Only (CRITICAL)**

    - BroadcastChannel ONLY works within a single browser instance
    - It CANNOT communicate across different users, computers, or even different browsers on the same computer
    - For multi-user coordination, you need server-side solutions (WebSockets, database locks, etc.)

2. **Same-Origin Only**

    - Communication only works between pages on the same origin
    - `https://app.example.com` cannot communicate with `https://other.example.com`

3. **Storage Partitioning (Third-Party Context)**

    - If DP2 is embedded as an iframe from a different origin, communication may be restricted
    - This is typically not an issue for same-origin tabs/windows

4. **No Persistence**

    - Messages are ephemeral - if a tab isn't listening when a message is sent, it won't receive it
    - For the DP2 use case, this is actually a **benefit** (no stale data)

5. **No Message Ordering Guarantees**
    - In practice, ordering is preserved, but the spec doesn't guarantee it
    - For complex scenarios, consider adding sequence numbers

---

## Alternative Approaches (Not Recommended for This Use Case)

| Approach                        | Why Not Ideal                                                            |
| ------------------------------- | ------------------------------------------------------------------------ |
| **localStorage/sessionStorage** | Requires persistent storage, event-based (not real-time), storage limits |
| **Cookies**                     | Size limits (4KB), expiration management, sent with every request        |
| **SharedWorker**                | More complex, requires separate worker file                              |
| **Service Worker**              | Overkill for this use case, requires HTTPS                               |
| **Window.postMessage**          | Requires maintaining window references, more complex                     |

---

## Conclusion

The BroadcastChannel API is an excellent fit for enabling multiple DP2 sessions from E1 because:

1. **No persistent storage** - Clean, in-memory only communication
2. **Simple implementation** - Minimal code required
3. **Automatic cleanup** - No orphaned data or stale sessions
4. **Real-time** - Instant message delivery
5. **Well-supported** - Available in all modern browsers

This POC demonstrates these capabilities and can serve as a foundation for the actual implementation.

---

## References

-   [MDN: Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
-   [MDN: BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
-   [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
