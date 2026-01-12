/**
 * ============================================================================
 * BROADCAST CHANNEL UTILITIES - Shared code for inter-tab communication
 * ============================================================================
 *
 * This module provides shared constants and utilities for the BroadcastChannel POC.
 * Both the controller and session pages import this file.
 */

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

/** The channel name used for communication. Must be identical across all tabs. */
export const CHANNEL_NAME = "poc-session-channel";

/**
 * Message types used in the channel communication protocol.
 * Using constants prevents typos and enables autocomplete.
 * @readonly
 * @enum {string}
 */
export const MESSAGE_TYPES = Object.freeze({
	// Controller -> Sessions
	CONTROLLER_READY: "controller-ready",
	BROADCAST: "broadcast",
	DIRECT_MESSAGE: "direct-message",
	CLOSE_SESSION: "close-session",
	CLOSE_ALL: "close-all",
	CONTROLLER_CLOSING: "controller-closing",

	// Sessions -> Controller
	SESSION_REGISTERED: "session-registered",
	SESSION_CLOSED: "session-closed",
	SESSION_MESSAGE: "session-message",
	SESSION_PING: "session-ping",
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
	SENT: "sent",
	RECEIVED: "received",
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
	/**
	 * Logs a message to the UI log container.
	 * @param {string} message - The message to display
	 * @param {string} [type='info'] - Log entry type (info, success, warning, error, sent, received)
	 */
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

/**
 * Creates a base message object with common fields.
 * @param {string} type - The message type from MESSAGE_TYPES
 * @returns {{type: string, timestamp: number}} Base message object
 */
function createBaseMessage(type) {
	return {
		type,
		timestamp: Date.now(),
	};
}

/**
 * Creates a broadcast message (controller -> all sessions).
 * @param {string} message - The message content
 * @returns {object} Message object ready for postMessage
 */
export function createBroadcastMessage(message) {
	return {
		...createBaseMessage(MESSAGE_TYPES.BROADCAST),
		source: "controller",
		message,
	};
}

/**
 * Creates a direct message to a specific session.
 * @param {string} targetSession - The session ID to send to
 * @param {string} message - The message content
 * @returns {object} Message object ready for postMessage
 */
export function createDirectMessage(targetSession, message) {
	return {
		...createBaseMessage(MESSAGE_TYPES.DIRECT_MESSAGE),
		source: "controller",
		targetSession,
		message,
	};
}

/**
 * Creates a close session request.
 * @param {string} targetSession - The session ID to close
 * @returns {object} Message object ready for postMessage
 */
export function createCloseSessionMessage(targetSession) {
	return {
		...createBaseMessage(MESSAGE_TYPES.CLOSE_SESSION),
		source: "controller",
		targetSession,
	};
}

/**
 * Creates a close all sessions request.
 * @returns {object} Message object ready for postMessage
 */
export function createCloseAllMessage() {
	return {
		...createBaseMessage(MESSAGE_TYPES.CLOSE_ALL),
		source: "controller",
	};
}

/**
 * Creates a controller ready notification.
 * @returns {object} Message object ready for postMessage
 */
export function createControllerReadyMessage() {
	return {
		...createBaseMessage(MESSAGE_TYPES.CONTROLLER_READY),
		source: "controller",
	};
}

/**
 * Creates a controller closing notification.
 * @returns {object} Message object ready for postMessage
 */
export function createControllerClosingMessage() {
	return {
		...createBaseMessage(MESSAGE_TYPES.CONTROLLER_CLOSING),
		source: "controller",
	};
}

/**
 * Creates a session registration message.
 * @param {string} sessionId - The session's unique ID
 * @param {string} [data=''] - Optional session data
 * @returns {object} Message object ready for postMessage
 */
export function createSessionRegisteredMessage(sessionId, data = "") {
	return {
		...createBaseMessage(MESSAGE_TYPES.SESSION_REGISTERED),
		sessionId,
		data,
	};
}

/**
 * Creates a session closed notification.
 * @param {string} sessionId - The session's unique ID
 * @returns {object} Message object ready for postMessage
 */
export function createSessionClosedMessage(sessionId) {
	return {
		...createBaseMessage(MESSAGE_TYPES.SESSION_CLOSED),
		sessionId,
	};
}

/**
 * Creates a session message (session -> controller).
 * @param {string} sessionId - The sending session's ID
 * @param {string} message - The message content
 * @returns {object} Message object ready for postMessage
 */
export function createSessionMessage(sessionId, message) {
	return {
		...createBaseMessage(MESSAGE_TYPES.SESSION_MESSAGE),
		sessionId,
		message,
	};
}

/**
 * Creates a session ping/heartbeat message.
 * @param {string} sessionId - The session's unique ID
 * @returns {object} Message object ready for postMessage
 */
export function createSessionPingMessage(sessionId) {
	return {
		...createBaseMessage(MESSAGE_TYPES.SESSION_PING),
		sessionId,
	};
}
