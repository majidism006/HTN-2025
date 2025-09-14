// Re-export DynamoDB storage functions
export { 
  getGroup, 
  saveGroup, 
  getGroupByCode, 
  updateGroup, 
  getAllGroups, 
  deleteGroup 
} from './dynamodb-storage';

// Legacy functions for backward compatibility
import { Group, GroupStorage } from './types';
import { getAllGroups as getAllGroupsFromDynamoDB } from './dynamodb-storage';

export async function readGroups(): Promise<GroupStorage> {
  return await getAllGroupsFromDynamoDB();
}

export async function writeGroups(groups: GroupStorage): Promise<void> {
  // This function is kept for backward compatibility but is not recommended
  // Use individual saveGroup calls instead
  console.warn('writeGroups is deprecated. Use individual saveGroup calls instead.');
  
  for (const group of Object.values(groups)) {
    await saveGroup(group);
  }
}
