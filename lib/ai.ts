import Groq from 'groq-sdk';
import { ParsedRequest } from './types';
import { parseRequest } from './parsing';

const SYSTEM_PROMPT = `You extract meeting scheduling constraints from raw text.
Return strict JSON with keys: duration (minutes, integer), participants (string[] of names if given), location (string|null), priority (string|null: exam|study|workout|social|high|medium|low), timeConstraints: { relativeDay?: 'today'|'tomorrow'|'this_week'|'next_week', timeWindow?: 'morning'|'afternoon'|'evening'|'night', startTime?: 'HH:MM', endTime?: 'HH:MM' }`;

function buildUserPrompt(text: string) {
  return `Text: ${text}\nReturn JSON only.`;
}

export async function parseWithGroq(text: string): Promise<ParsedRequest | null> {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_READONLY;
  if (!apiKey) return null;
  try {
    const groq = new Groq({ apiKey });
    const rsp = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(text) }
      ]
    });
    const content = rsp.choices?.[0]?.message?.content || '';
    const json = JSON.parse(content);
    return toParsedRequest(json, text);
  } catch {
    return null;
  }
}

export async function parseWithCohere(text: string): Promise<ParsedRequest | null> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.COHERE_MODEL || 'command-r-plus',
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(text) }
        ]
      })
    });
    const data = await res.json();
    const content = data?.message?.content?.[0]?.text || data?.text || '';
    const json = JSON.parse(content);
    return toParsedRequest(json, text);
  } catch {
    return null;
  }
}

export async function parseWithGemini(text: string): Promise<ParsedRequest | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest')}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'user', parts: [{ text: buildUserPrompt(text) }] }
        ]
      })
    });
    const data = await res.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const json = JSON.parse(content);
    return toParsedRequest(json, text);
  } catch {
    return null;
  }
}

function toParsedRequest(json: any, original: string): ParsedRequest {
  const duration = Math.max(15, parseInt(json.duration || 60));
  const participants = Array.isArray(json.participants) ? json.participants : [];
  const location = json.location || undefined;
  const priority = json.priority || undefined;
  const timeConstraints = json.timeConstraints || {};
  return {
    constraints: { duration, participants, location, priority, timeConstraints },
    normalizedSummary: `${Math.floor(duration/60)}h ${duration%60}m ${participants.length ? 'with '+participants.join(', ') : ''}`.trim(),
    assumptions: []
  };
}

export async function parseSmart(text: string): Promise<ParsedRequest> {
  const providers: Array<(t: string) => Promise<ParsedRequest | null>> = [];
  const pref = (process.env.AI_PARSER_PROVIDER || '').toLowerCase();
  if (pref === 'cohere') providers.push(parseWithCohere);
  if (pref === 'groq') providers.push(parseWithGroq);
  if (pref === 'gemini') providers.push(parseWithGemini);
  if (providers.length === 0) providers.push(parseWithCohere, parseWithGroq, parseWithGemini);

  for (const p of providers) {
    const out = await p(text);
    if (out) return out;
  }
  return parseRequest(text);
}

