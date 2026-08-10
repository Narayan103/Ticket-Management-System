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

const googleGenerativeAiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!googleGenerativeAiApiKey) {
  throw new Error("GOOGLE_GENERATIVE_AI_API_KEY must be set in the environment");
}

export const GOOGLE_GENERATIVE_AI_API_KEY = googleGenerativeAiApiKey;

const sendgridApiKey = process.env.SENDGRID_API_KEY;

if (!sendgridApiKey) {
  throw new Error("SENDGRID_API_KEY must be set in the environment");
}

export const SENDGRID_API_KEY = sendgridApiKey;

const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;

if (!sendgridFromEmail) {
  throw new Error("SENDGRID_FROM_EMAIL must be set in the environment");
}

export const SENDGRID_FROM_EMAIL = sendgridFromEmail;
