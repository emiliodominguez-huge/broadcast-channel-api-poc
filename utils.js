/**
 * ============================================================================
 * BROADCAST CHANNEL UTILITIES - Shared code for inter-tab communication
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

/** The channel name used for communication. Must be identical across all tabs. */
export const CHANNEL_NAME = "poc-session-channel";

/**
 * Message types used in the channel communication protocol.
 * @readonly
 * @enum {string}
 */
export const MESSAGE_TYPES = Object.freeze({
	// Session -> Session (duplicate detection)
	SESSION_HASH_QUERY: "session-hash-query",
	SESSION_HASH_CLAIM: "session-hash-claim",

	// Session lifecycle (for sibling awareness)
	SESSION_REGISTERED: "session-registered",
	SESSION_CLOSED: "session-closed",
});

/**
 * Log entry types for styling purposes.
 * @readonly
 * @enum {string}
 */
export const LOG_TYPES = Object.freeze({
	INFO: "info",
	SUCCESS: "success",
	WARNING: "warning",
	ERROR: "error",
});

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------

/**
 * Creates a log function bound to a specific container element.
 * @param {HTMLElement} container - The DOM element to append log entries to
 * @returns {function(string, string): void} A log function
 */
export function createLogger(container) {
	return function log(message, type = LOG_TYPES.INFO) {
		const entry = document.createElement("div");
		entry.className = `log-entry ${type}`;
		entry.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> ${message}`;
		container.insertBefore(entry, container.firstChild);
	};
}

// ----------------------------------------------------------------------------
// Message Factory Functions
// ----------------------------------------------------------------------------

function createBaseMessage(type) {
	return {
		type,
		timestamp: Date.now(),
	};
}

/**
 * Creates a hash query message to check if a hash is already claimed.
 * @param {string} hash - The hash being queried
 * @param {string} queryId - Unique ID for this query (to match responses)
 */
export function createHashQueryMessage(hash, queryId) {
	return {
		...createBaseMessage(MESSAGE_TYPES.SESSION_HASH_QUERY),
		hash,
		queryId,
	};
}

/**
 * Creates a hash claim response indicating this session owns the hash.
 * @param {string} hash - The hash being claimed
 * @param {string} queryId - The query ID being responded to
 * @param {string} sessionId - The session claiming the hash
 */
export function createHashClaimMessage(hash, queryId, sessionId) {
	return {
		...createBaseMessage(MESSAGE_TYPES.SESSION_HASH_CLAIM),
		hash,
		queryId,
		sessionId,
	};
}

/**
 * Creates a session registration message.
 * @param {string} sessionId - The session's unique ID
 * @param {string} [hash=''] - The session hash
 */
export function createSessionRegisteredMessage(sessionId, hash = "") {
	return {
		...createBaseMessage(MESSAGE_TYPES.SESSION_REGISTERED),
		sessionId,
		hash,
	};
}

/**
 * Creates a session closed notification.
 * @param {string} sessionId - The session's unique ID
 */
export function createSessionClosedMessage(sessionId) {
	return {
		...createBaseMessage(MESSAGE_TYPES.SESSION_CLOSED),
		sessionId,
	};
}
