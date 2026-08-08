const clientUrl = process.env.CLIENT_URL;

if (!clientUrl) {
  throw new Error("CLIENT_URL must be set in the environment");
}

export const CLIENT_URL = clientUrl;

const inboundEmailWebhookSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;

if (!inboundEmailWebhookSecret) {
  throw new Error("INBOUND_EMAIL_WEBHOOK_SECRET must be set in the environment");
}

export const INBOUND_EMAIL_WEBHOOK_SECRET = inboundEmailWebhookSecret;
