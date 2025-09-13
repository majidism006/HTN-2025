import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { getUserTokens, saveUserTokens } from './google-token-store';

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar'
];

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function getOAuthClient() {
  const clientId = envOrThrow('GOOGLE_CLIENT_ID');
  const clientSecret = envOrThrow('GOOGLE_CLIENT_SECRET');
  const redirectUri = envOrThrow('GOOGLE_REDIRECT_URI');
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function createAuthUrl(state: string) {
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: OAUTH_SCOPES,
    prompt: 'consent',
    state,
  });
  return url;
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function hasGoogleAuth(userId: string): Promise<boolean> {
  const tokens = await getUserTokens(userId);
  return !!tokens?.access_token;
}

export type CalendarEventInput = {
  title: string;
  description?: string;
  start: string; // ISO
  end: string;   // ISO
  attendeesEmails?: string[];
};

export async function insertEventForUser(userId: string, event: CalendarEventInput) {
  const tokens = await getUserTokens(userId);
  if (!tokens?.access_token) {
    throw new Error('No Google tokens for user');
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const requestBody: any = {
    summary: event.title,
    description: event.description,
    start: { dateTime: event.start },
    end: { dateTime: event.end },
    attendees: event.attendeesEmails?.map(email => ({ email })) || [],
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody,
    sendUpdates: 'all'
  });
  return res.data;
}

