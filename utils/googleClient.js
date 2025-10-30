import { google } from "googleapis";

export const getGoogleAuthClient = (accessToken) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
};