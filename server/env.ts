const clientUrl = process.env.CLIENT_URL;

if (!clientUrl) {
  throw new Error("CLIENT_URL must be set in the environment");
}

export const CLIENT_URL = clientUrl;
