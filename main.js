/**
 * ============================================================================
 * SESSION - Peer-to-peer session with duplicate detection
 * ============================================================================
 *
 * Sessions are identified by the `hash` query parameter (e.g., index.html?hash=abc123).
 * When a new session opens, it checks if another session with the same hash
 * already exists. If so, the new session closes itself to prevent duplicates.
 */

import {
	CHANNEL_NAME,
	MESSAGE_TYPES,
	LOG_TYPES,
	createLogger,
	createSessionRegisteredMessage,
	createSessionClosedMessage,
	createHashQueryMessage,
	createHashClaimMessage,
} from "./utils.js";

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------

/** @type {number} Time to wait for duplicate check responses (ms) */
const DUPLICATE_CHECK_TIMEOUT = 300;

// ----------------------------------------------------------------------------
// Initialize BroadcastChannel
// ----------------------------------------------------------------------------

/** @type {BroadcastChannel} */
const channel = new BroadcastChannel(CHANNEL_NAME);

// ----------------------------------------------------------------------------
// Parse URL Query Params for Session ID
// ----------------------------------------------------------------------------

const urlParams = new URLSearchParams(window.location.search);

/** @type {string} */
const sessionHash = urlParams.get("hash") || `session-${Date.now()}`;

/** @type {string} */
const sessionId = sessionHash;

// ----------------------------------------------------------------------------
// DOM Elements
// ----------------------------------------------------------------------------

/** @type {HTMLElement} */
const sessionIdDisplay = document.getElementById("session-id-display");

/** @type {HTMLElement} */
const displaySessionId = document.getElementById("display-session-id");

/** @type {HTMLElement} */
const displayHash = document.getElementById("display-hash");

/** @type {HTMLElement} */
const displayStatus = document.getElementById("display-status");

/** @type {HTMLButtonElement} */
const closeBtn = document.getElementById("close-btn");

/** @type {HTMLElement} */
const logContainer = document.getElementById("log-container");

/** @type {function(string, string): void} */
const log = createLogger(logContainer);

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------

/** @type {boolean} Whether this session has been verified as unique */
let isVerified = false;

/** @type {boolean} Whether this session is closing due to being a duplicate */
let isClosingAsDuplicate = false;

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
	displayHash.textContent = sessionHash;
}

// ----------------------------------------------------------------------------
// Duplicate Detection
// ----------------------------------------------------------------------------

/**
 * Checks if another session with the same hash already exists.
 * @returns {Promise<boolean>} True if this session is unique, false if duplicate
 */
function checkForDuplicates() {
	return new Promise((resolve) => {
		const queryId = `query-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		log(`Checking for existing session with hash: ${sessionHash}`, LOG_TYPES.INFO);

		/**
		 * Handles claim responses from other sessions.
		 * @param {MessageEvent} event - The message event
		 */
		function handleClaim(event) {
			const msgData = event.data;

			if (msgData.type === MESSAGE_TYPES.SESSION_HASH_CLAIM && msgData.queryId === queryId && msgData.hash === sessionHash) {
				log(`Duplicate found! Session "${msgData.sessionId}" already owns this hash.`, LOG_TYPES.WARNING);
				channel.removeEventListener("message", handleClaim);
				resolve(false);
			}
		}

		channel.addEventListener("message", handleClaim);
		channel.postMessage(createHashQueryMessage(sessionHash, queryId));

		setTimeout(() => {
			channel.removeEventListener("message", handleClaim);

			if (!isClosingAsDuplicate) {
				log("No duplicate found. This session is unique.", LOG_TYPES.SUCCESS);
				resolve(true);
			}
		}, DUPLICATE_CHECK_TIMEOUT);
	});
}

/**
 * Closes this session because it's a duplicate.
 */
function closeAsDuplicate() {
	isClosingAsDuplicate = true;

	log("Closing this window - another session with this hash is already active.", LOG_TYPES.WARNING);
	updateStatus("Duplicate - Closing", false);

	setTimeout(() => {
		channel.close();
		window.close();

		// Fallback if window.close() is blocked
		document.body.innerHTML = `
			<div class="container" style="text-align: center; padding-top: 100px;">
				<h1>Duplicate Session</h1>
				<p>A session with hash <strong>${sessionHash}</strong> is already open.</p>
				<p>This window will close. Please use the existing session.</p>
			</div>
		`;
	}, 500);
}

// ----------------------------------------------------------------------------
// Session Lifecycle
// ----------------------------------------------------------------------------

/**
 * Registers this session with the channel.
 */
function registerSession() {
	channel.postMessage(createSessionRegisteredMessage(sessionId, sessionHash));
	updateStatus("Active", true);
	log("Session registered", LOG_TYPES.SUCCESS);
}

/**
 * Gracefully closes this session.
 */
function closeSession() {
	channel.postMessage(createSessionClosedMessage(sessionId));
	log("Session closing", LOG_TYPES.WARNING);

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
function handleMessage(event) {
	const msgData = event.data;

	// Handle hash queries from other sessions
	if (msgData.type === MESSAGE_TYPES.SESSION_HASH_QUERY) {
		if (isVerified && msgData.hash === sessionHash) {
			log(`Another session queried for hash "${msgData.hash}" - responding with claim`, LOG_TYPES.INFO);
			channel.postMessage(createHashClaimMessage(sessionHash, msgData.queryId, sessionId));
		}

		return;
	}

	// Skip our own messages
	if (msgData.sessionId === sessionId) return;

	switch (msgData.type) {
		case MESSAGE_TYPES.SESSION_REGISTERED:
			log(`Sibling session opened: ${msgData.sessionId}`, LOG_TYPES.INFO);
			break;

		case MESSAGE_TYPES.SESSION_CLOSED:
			log(`Sibling session closed: ${msgData.sessionId}`, LOG_TYPES.INFO);
			break;
	}
}

/**
 * Handles message deserialization errors.
 */
function handleMessageError() {
	log("Failed to deserialize incoming message", LOG_TYPES.ERROR);
}

channel.onmessage = handleMessage;
channel.onmessageerror = handleMessageError;

// ----------------------------------------------------------------------------
// Event Listeners
// ----------------------------------------------------------------------------

closeBtn.addEventListener("click", closeSession);

window.addEventListener("beforeunload", () => {
	if (!isClosingAsDuplicate) {
		channel.postMessage(createSessionClosedMessage(sessionId));
	}

	channel.close();
});

// ----------------------------------------------------------------------------
// Initialize
// ----------------------------------------------------------------------------

/**
 * Initializes the session by checking for duplicates and registering if unique.
 */
async function initialize() {
	initializeDisplay();
	updateStatus("Checking for duplicates...", false);

	const isUnique = await checkForDuplicates();

	if (isUnique) {
		isVerified = true;

		registerSession();
		log(`Session initialized with hash: ${sessionHash}`, LOG_TYPES.INFO);
	} else {
		closeAsDuplicate();
	}
}

initialize();
