import { promises as fs } from 'fs';
import path from 'path';

type TokenData = {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
};

type TokenStore = Record<string, TokenData>;

const DATA_DIR = path.join(process.cwd(), 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'google-tokens.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
}

export async function readTokenStore(): Promise<TokenStore> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function writeTokenStore(store: TokenStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(TOKENS_FILE, JSON.stringify(store, null, 2));
}

export async function getUserTokens(userId: string): Promise<TokenData | null> {
  const store = await readTokenStore();
  return store[userId] ?? null;
}

export async function saveUserTokens(userId: string, tokens: TokenData): Promise<void> {
  const store = await readTokenStore();
  store[userId] = tokens;
  await writeTokenStore(store);
}

export async function deleteUserTokens(userId: string): Promise<void> {
  const store = await readTokenStore();
  if (store[userId]) {
    delete store[userId];
    await writeTokenStore(store);
  }
}

