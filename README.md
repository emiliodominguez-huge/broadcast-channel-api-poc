# BroadcastChannel API POC

Duplicate session detection using the BroadcastChannel API.

## Quick Start

```bash
# Start a local server
npx serve .
# or
python3 -m http.server 3000
```

Then open these URLs to test:

1. `http://localhost:3000?hash=test-123` - First session opens normally
2. `http://localhost:3000?hash=test-123` - Second session auto-closes (duplicate)
3. `http://localhost:3000?hash=test-456` - Different hash, opens normally

> ES modules require a server. Opening HTML files directly (`file://`) won't work.

---

## How It Works

Sessions coordinate peer-to-peer via BroadcastChannel to prevent duplicates:

1. **New session opens** with a `hash` query parameter
2. **Broadcasts query**: "Does anyone have this hash?"
3. **Existing session responds** with a claim if it owns that hash
4. **New session closes itself** if a claim is received
5. **Otherwise registers** as the owner of that hash

```
┌──────────────────┐         ┌──────────────────┐
│  New Session     │         │ Existing Session │
│  ?hash=abc123    │         │  ?hash=abc123    │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │  SESSION_HASH_QUERY        │
         │  "Who has abc123?"         │
         │ ─────────────────────────► │
         │                            │
         │  SESSION_HASH_CLAIM        │
         │  "I have abc123"           │
         │ ◄───────────────────────── │
         │                            │
         │                            │
    ┌────┴────┐                       │
    │  CLOSE  │                       │
    └─────────┘                       │
```

---

## Project Structure

```
broadcast-channel-api-poc/
├── index.html    # Session page
├── main.js       # Session logic with duplicate detection
├── utils.js      # Shared constants and message factories
├── styles.css    # Styling
└── README.md
```

---

## Message Types

| Type                 | Direction | Description                          |
| -------------------- | --------- | ------------------------------------ |
| `session-hash-query` | Broadcast | New session asking who owns a hash   |
| `session-hash-claim` | Response  | Existing session claiming ownership  |
| `session-registered` | Broadcast | Session announcing it's active       |
| `session-closed`     | Broadcast | Session announcing it's closing      |

---

## Configuration

In `main.js`:

```javascript
const DUPLICATE_CHECK_TIMEOUT = 300; // ms to wait for responses
```

---

## Browser Support

| Browser | Version |
| ------- | ------- |
| Chrome  | 54+     |
| Firefox | 38+     |
| Edge    | 79+     |
| Safari  | 15.4+   |

---

## References

- [MDN: BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
