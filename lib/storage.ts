import { promises as fs } from 'fs';
import path from 'path';
import { Group, GroupStorage } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Read groups from file
export async function readGroups(): Promise<GroupStorage> {
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(GROUPS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty object
    return {};
  }
}

// Write groups to file
export async function writeGroups(groups: GroupStorage): Promise<void> {
  await ensureDataDir();
  
  try {
    await fs.writeFile(GROUPS_FILE, JSON.stringify(groups, null, 2));
  } catch (error) {
    console.error('Failed to write groups file:', error);
    throw new Error('Failed to save group data');
  }
}

// Get a specific group
export async function getGroup(groupId: string): Promise<Group | null> {
  const groups = await readGroups();
  return groups[groupId] || null;
}

// Save a group
export async function saveGroup(group: Group): Promise<void> {
  const groups = await readGroups();
  groups[group.id] = group;
  await writeGroups(groups);
}

// Get group by code
export async function getGroupByCode(code: string): Promise<Group | null> {
  const groups = await readGroups();
  
  for (const group of Object.values(groups)) {
    if (group.code === code) {
      return group;
    }
  }
  
  return null;
}
