/**
 * ============================================================================
 * SESSION - Child window that communicates with the controller
 * ============================================================================
 */

import {
	CHANNEL_NAME,
	MESSAGE_TYPES,
	LOG_TYPES,
	createLogger,
	createSessionRegisteredMessage,
	createSessionClosedMessage,
	createSessionMessage,
	createSessionPingMessage,
} from "./utils.js";

// ----------------------------------------------------------------------------
// Initialize BroadcastChannel
// ----------------------------------------------------------------------------
const channel = new BroadcastChannel(CHANNEL_NAME);

// ----------------------------------------------------------------------------
// Parse URL Parameters
// ----------------------------------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get("sessionId") || `Session-${Date.now()}`;
const data = urlParams.get("data") || "";

// ----------------------------------------------------------------------------
// DOM Elements
// ----------------------------------------------------------------------------
const sessionIdDisplay = document.getElementById("session-id-display");
const displaySessionId = document.getElementById("display-session-id");
const displayData = document.getElementById("display-data");
const displayStatus = document.getElementById("display-status");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const closeBtn = document.getElementById("close-btn");
const logContainer = document.getElementById("log-container");

// Create logger bound to our log container
const log = createLogger(logContainer);

// ----------------------------------------------------------------------------
// UI Functions
// ----------------------------------------------------------------------------

/**
 * Updates the connection status badge.
 * @param {string} status - Status text to display
 * @param {boolean} [isConnected=true] - Whether connected (affects styling)
 */
function updateStatus(status, isConnected = true) {
	displayStatus.textContent = status;
	displayStatus.className = `status-badge ${isConnected ? "connected" : "disconnected"}`;
}

/**
 * Initializes the display with session information.
 */
function initializeDisplay() {
	document.title = `Session - ${sessionId}`;
	sessionIdDisplay.textContent = sessionId;
	displaySessionId.textContent = sessionId;
	displayData.textContent = data || "None";
}

/**
 * Applies a flash animation to the body for visual feedback.
 * @param {string} className - The flash class to apply
 * @param {number} duration - Duration in ms before removing the class
 */
function flashBody(className, duration) {
	document.body.classList.add(className);
	setTimeout(() => document.body.classList.remove(className), duration);
}

// ----------------------------------------------------------------------------
// Session Lifecycle
// ----------------------------------------------------------------------------

/**
 * Registers this session with the controller.
 */
function registerSession() {
	channel.postMessage(createSessionRegisteredMessage(sessionId, data));
	updateStatus("Connected", true);
	log("Session registered with controller", LOG_TYPES.SUCCESS);
}

/**
 * Sends a message to the controller.
 */
function sendMessage() {
	const message = messageInput.value.trim();

	if (!message) {
		log("Please enter a message", LOG_TYPES.WARNING);
		return;
	}

	channel.postMessage(createSessionMessage(sessionId, message));
	log(`Sent: "${message}"`, LOG_TYPES.SENT);
	messageInput.value = "";
}

/**
 * Gracefully closes this session.
 */
function closeSession() {
	channel.postMessage(createSessionClosedMessage(sessionId));
	log("Notified controller of session closure", LOG_TYPES.WARNING);

	channel.close();
	window.close();

	// Fallback if window.close() is blocked
	document.body.innerHTML = `
		<div class="container" style="text-align: center; padding-top: 100px;">
			<h1>Session Closed</h1>
			<p>You can close this tab.</p>
		</div>
	`;
}

// ----------------------------------------------------------------------------
// Message Handling
// ----------------------------------------------------------------------------

/**
 * Handles incoming messages from the channel.
 * @param {MessageEvent} event - The message event
 */
channel.onmessage = (event) => {
	const msgData = event.data;

	// Skip our own messages
	if (msgData.sessionId === sessionId) return;

	switch (msgData.type) {
		// Messages from controller
		case MESSAGE_TYPES.BROADCAST:
			log(`Broadcast from controller: "${msgData.message}"`, LOG_TYPES.RECEIVED);
			flashBody("flash", 300);
			break;

		case MESSAGE_TYPES.DIRECT_MESSAGE:
			if (msgData.targetSession === sessionId) {
				log(`Direct message: "${msgData.message}"`, LOG_TYPES.RECEIVED);
				flashBody("flash-direct", 500);
			}
			break;

		case MESSAGE_TYPES.CLOSE_SESSION:
			if (msgData.targetSession === sessionId) {
				log("Controller requested this session to close", LOG_TYPES.WARNING);
				setTimeout(closeSession, 1000);
			}
			break;

		case MESSAGE_TYPES.CLOSE_ALL:
			log("Controller requested all sessions to close", LOG_TYPES.WARNING);
			setTimeout(closeSession, 1000);
			break;

		case MESSAGE_TYPES.CONTROLLER_CLOSING:
			log("Controller is closing. This session is now orphaned.", LOG_TYPES.WARNING);
			updateStatus("Disconnected", false);
			break;

		case MESSAGE_TYPES.CONTROLLER_READY:
			// Controller is back (e.g., after a refresh), re-register
			log("Controller is ready. Re-registering session.", LOG_TYPES.INFO);
			registerSession();
			break;

		// Messages from sibling sessions
		case MESSAGE_TYPES.SESSION_REGISTERED:
			if (msgData.sessionId !== sessionId) {
				log(`New sibling session: ${msgData.sessionId}`, LOG_TYPES.INFO);
			}
			break;

		case MESSAGE_TYPES.SESSION_CLOSED:
			if (msgData.sessionId !== sessionId) {
				log(`Sibling session closed: ${msgData.sessionId}`, LOG_TYPES.INFO);
			}
			break;
	}
};

channel.onmessageerror = () => {
	log("Failed to deserialize incoming message", LOG_TYPES.ERROR);
};

// ----------------------------------------------------------------------------
// Event Listeners
// ----------------------------------------------------------------------------

sendBtn.addEventListener("click", sendMessage);
closeBtn.addEventListener("click", closeSession);
messageInput.addEventListener("keypress", (e) => e.key === "Enter" && sendMessage());

// ----------------------------------------------------------------------------
// Cleanup
// ----------------------------------------------------------------------------

window.addEventListener("beforeunload", () => {
	channel.postMessage(createSessionClosedMessage(sessionId));
	channel.close();
});

// ----------------------------------------------------------------------------
// Heartbeat
// ----------------------------------------------------------------------------

setInterval(() => {
	channel.postMessage(createSessionPingMessage(sessionId));
}, 30000);

// ----------------------------------------------------------------------------
// Initialize
// ----------------------------------------------------------------------------

initializeDisplay();
registerSession();
log(`Session initialized${data ? ` with data: ${data}` : ""}`, LOG_TYPES.INFO);
