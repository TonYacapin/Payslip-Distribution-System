// Email sending configuration
export const EMAIL_CONFIG = {
  // For aggressive providers (Gmail, Outlook):
  AGGRESSIVE: {
    BATCH_SIZE: 3,
    DELAY_BETWEEN_BATCHES: 3000,
    DELAY_BETWEEN_EMAILS: 1000,
    PROCESS_TIMEOUT: 45000
  },
  // For dedicated SMTP servers:
  DEDICATED: {
    BATCH_SIZE: 10,
    DELAY_BETWEEN_BATCHES: 1000,
    DELAY_BETWEEN_EMAILS: 200,
    PROCESS_TIMEOUT: 30000
  },
  // Default configuration
  DEFAULT: {
    BATCH_SIZE: 5,
    DELAY_BETWEEN_BATCHES: 2000,
    DELAY_BETWEEN_EMAILS: 500,
    PROCESS_TIMEOUT: 30000
  }
}

// Get configuration based on provider type
export function getEmailConfig(providerType: 'aggressive' | 'dedicated' | 'default' = 'default') {
  return EMAIL_CONFIG[providerType.toUpperCase() as keyof typeof EMAIL_CONFIG] || EMAIL_CONFIG.DEFAULT
}