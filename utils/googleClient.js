import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

export const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};
export const getGoogleAuthClient = async (user) => {
  if (!user.googleTokens || !user.googleTokens.refresh_token) {
    throw new Error("Google account not linked or refresh token missing");
  }

  const oauth2Client = getOAuthClient();

  oauth2Client.setCredentials({
    access_token: user.googleTokens.access_token,
    refresh_token: user.googleTokens.refresh_token,
    expiry_date: user.googleTokens.expiry_date,
  });

  if (!user.googleTokens.expiry_date || Date.now() >= user.googleTokens.expiry_date) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      user.googleTokens.access_token = credentials.access_token;
      if (credentials.refresh_token) {
        user.googleTokens.refresh_token = credentials.refresh_token;
      }
      user.googleTokens.expiry_date =
        credentials.expiry_date || Date.now() + 3600 * 1000;

      await user.save();

      oauth2Client.setCredentials(user.googleTokens);
    } catch (err) {
      console.error("Failed to refresh Google token:", err.message);
      throw new Error("Google authentication expired. Please re-link your Google account.");
    }
  }

  return oauth2Client;
};
