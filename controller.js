/**
 * ============================================================================
 * CONTROLLER - Main window that manages sessions
 * ============================================================================
 */

import {
	CHANNEL_NAME,
	MESSAGE_TYPES,
	LOG_TYPES,
	createLogger,
	createBroadcastMessage,
	createDirectMessage,
	createCloseSessionMessage,
	createCloseAllMessage,
	createControllerReadyMessage,
	createControllerClosingMessage,
} from "./utils.js";

// ----------------------------------------------------------------------------
// Initialize BroadcastChannel
// ----------------------------------------------------------------------------
const channel = new BroadcastChannel(CHANNEL_NAME);

// ----------------------------------------------------------------------------
// Application State
// ----------------------------------------------------------------------------
/** @type {Map<string, {data: string, registeredAt: number, lastPing?: number}>} */
const activeSessions = new Map();
let sessionCounter = 0;

// ----------------------------------------------------------------------------
// DOM Elements
// ----------------------------------------------------------------------------
const sessionDataInput = document.getElementById("session-data");
const launchBtn = document.getElementById("launch-btn");
const broadcastMsgInput = document.getElementById("broadcast-msg");
const broadcastBtn = document.getElementById("broadcast-btn");
const closeAllBtn = document.getElementById("close-all-btn");
const sessionList = document.getElementById("session-list");
const sessionCountEl = document.getElementById("session-count");
const logContainer = document.getElementById("log-container");

// Create logger bound to our log container
const log = createLogger(logContainer);

// ----------------------------------------------------------------------------
// UI Functions
// ----------------------------------------------------------------------------

/**
 * Updates the session list UI to reflect current active sessions.
 */
function updateSessionList() {
	sessionCountEl.textContent = `(${activeSessions.size})`;

	if (activeSessions.size === 0) {
		sessionList.innerHTML = '<p class="empty-state">No active sessions. Launch a session to begin.</p>';
		return;
	}

	sessionList.innerHTML = "";
	activeSessions.forEach((session, id) => {
		const div = document.createElement("div");
		div.className = "session-item";
		div.innerHTML = `
			<div class="session-info">
				<strong>${id}</strong>
				<span>Data: ${session.data || "N/A"}</span>
			</div>
			<button class="btn small" data-action="send" data-session="${id}">Send Message</button>
			<button class="btn small danger" data-action="close" data-session="${id}">Close</button>
		`;
		sessionList.appendChild(div);
	});
}

// ----------------------------------------------------------------------------
// Session Management
// ----------------------------------------------------------------------------

/**
 * Opens a new browser tab with a child session.
 */
function launchSession() {
	sessionCounter++;
	const sessionId = `Session-${sessionCounter}`;
	const data = sessionDataInput.value || "";

	const url = `session.html?sessionId=${sessionId}&data=${encodeURIComponent(data)}`;
	window.open(url, "_blank");

	log(`Launched: ${sessionId}`, LOG_TYPES.SUCCESS);
}

/**
 * Broadcasts a message to all connected sessions.
 */
function broadcastMessage() {
	const message = broadcastMsgInput.value.trim();
	if (!message) {
		log("Please enter a message to broadcast", LOG_TYPES.WARNING);
		return;
	}

	channel.postMessage(createBroadcastMessage(message));
	log(`Broadcasted: "${message}"`, LOG_TYPES.SENT);
	broadcastMsgInput.value = "";
}

/**
 * Sends a message to a specific session.
 * @param {string} sessionId - Target session ID
 */
function sendToSession(sessionId) {
	const message = prompt(`Enter message for ${sessionId}:`);
	if (!message) return;

	channel.postMessage(createDirectMessage(sessionId, message));
	log(`Sent to ${sessionId}: "${message}"`, LOG_TYPES.SENT);
}

/**
 * Requests a specific session to close.
 * @param {string} sessionId - Target session ID
 */
function closeSession(sessionId) {
	channel.postMessage(createCloseSessionMessage(sessionId));
	log(`Requested ${sessionId} to close`, LOG_TYPES.WARNING);
}

/**
 * Requests all sessions to close.
 */
function closeAllSessions() {
	if (!confirm("Close all sessions?")) return;

	channel.postMessage(createCloseAllMessage());
	log("Requested all sessions to close", LOG_TYPES.WARNING);
}

// ----------------------------------------------------------------------------
// Message Handling
// ----------------------------------------------------------------------------

/**
 * Handles incoming messages from sessions.
 * @param {MessageEvent} event - The message event
 */
channel.onmessage = (event) => {
	const data = event.data;

	switch (data.type) {
		case MESSAGE_TYPES.SESSION_REGISTERED:
			activeSessions.set(data.sessionId, {
				data: data.data,
				registeredAt: data.timestamp,
			});
			updateSessionList();
			log(`Session registered: ${data.sessionId}`, LOG_TYPES.SUCCESS);
			break;

		case MESSAGE_TYPES.SESSION_CLOSED:
			activeSessions.delete(data.sessionId);
			updateSessionList();
			log(`Session closed: ${data.sessionId}`, LOG_TYPES.WARNING);
			break;

		case MESSAGE_TYPES.SESSION_MESSAGE:
			log(`From ${data.sessionId}: ${data.message}`, LOG_TYPES.RECEIVED);
			break;

		case MESSAGE_TYPES.SESSION_PING:
			if (activeSessions.has(data.sessionId)) {
				activeSessions.get(data.sessionId).lastPing = data.timestamp;
			}
			break;
	}
};

channel.onmessageerror = () => {
	log("Message error - data could not be deserialized", LOG_TYPES.ERROR);
};

// ----------------------------------------------------------------------------
// Event Listeners
// ----------------------------------------------------------------------------

launchBtn.addEventListener("click", launchSession);
broadcastBtn.addEventListener("click", broadcastMessage);
closeAllBtn.addEventListener("click", closeAllSessions);
sessionDataInput.addEventListener("keypress", (e) => e.key === "Enter" && launchSession());
broadcastMsgInput.addEventListener("keypress", (e) => e.key === "Enter" && broadcastMessage());

// Event delegation for dynamically created session buttons
sessionList.addEventListener("click", (e) => {
	const button = e.target.closest("button[data-action]");
	if (!button) return;

	const action = button.dataset.action;
	const sessionId = button.dataset.session;

	if (action === "send") sendToSession(sessionId);
	if (action === "close") closeSession(sessionId);
});

// ----------------------------------------------------------------------------
// Cleanup
// ----------------------------------------------------------------------------

window.addEventListener("beforeunload", () => {
	channel.postMessage(createControllerClosingMessage());
	channel.close();
});

// ----------------------------------------------------------------------------
// Initialize
// ----------------------------------------------------------------------------

// Notify any existing sessions that controller is ready
channel.postMessage(createControllerReadyMessage());
log("Controller initialized. BroadcastChannel is active.", LOG_TYPES.INFO);
