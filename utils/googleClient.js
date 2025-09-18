import { google } from "googleapis";
import dotenv from 'dotenv';
dotenv.config();
export const getGoogleAuthClient = async (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: user.google.accessToken,
    refresh_token: user.google.refreshToken,
    expiry_date: user.google.expiryDate,
  });

  // Check if expired
  if (!user.google.accessToken || Date.now() >= user.google.expiryDate) {
    const tokens = await oauth2Client.refreshAccessToken();
    const newTokens = tokens.credentials;

    // Save new tokens
    user.google.accessToken = newTokens.access_token;
    user.google.expiryDate = newTokens.expiry_date;
    await user.save();

    oauth2Client.setCredentials(newTokens);
  }

  return oauth2Client;
};
