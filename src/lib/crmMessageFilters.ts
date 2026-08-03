/**
 * Shared SQL fragments for CRM lead_messages analytics (2026).
 */

/** Customer incoming messages (excludes classified automation rows). */
export const HUMAN_INCOMING_MESSAGE_FILTER = `
  lm.is_private = false
  AND COALESCE(lm.is_automation, false) = false
  AND (lm.direction = 'incoming' OR lm.message_type = 'incoming')
`;

/** Human agent outbound messages (excludes bot/automation). */
export const HUMAN_OUTBOUND_MESSAGE_FILTER = `
  lm.is_private = false
  AND COALESCE(lm.is_automation, false) = false
  AND lm.direction = 'outgoing'
  AND lm.message_type = 'outgoing'
  AND lm.sender_type = 'user'
`;

/** Classified automation/bot outbound messages. */
export const AUTOMATION_OUTBOUND_MESSAGE_FILTER = `
  lm.is_private = false
  AND lm.is_automation = true
  AND (lm.direction = 'outgoing' OR lm.message_type = 'outgoing')
`;

/**
 * All outgoing messages minus bot messages, i.e. the complement of
 * AUTOMATION_OUTBOUND_MESSAGE_FILTER over the same outbound set.
 * Broader than HUMAN_OUTBOUND_MESSAGE_FILTER: it also keeps mis-synced rows
 * whose sender metadata is missing but which are not classified as automation.
 */
export const HUMAN_OUTGOING_MESSAGE_FILTER = `
  lm.is_private = false
  AND COALESCE(lm.is_automation, false) = false
  AND (lm.direction = 'outgoing' OR lm.message_type = 'outgoing')
`;
