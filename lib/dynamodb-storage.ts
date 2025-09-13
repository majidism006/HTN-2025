import { 
  PutCommand, 
  GetCommand, 
  ScanCommand, 
  UpdateCommand,
  DeleteCommand 
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient, GROUPS_TABLE } from './dynamodb';
import { Group, GroupStorage } from './types';

// DynamoDB Table Schema:
// Primary Key: PK (Partition Key) = "GROUP#{groupId}"
// Sort Key: SK (Sort Key) = "GROUP#{groupId}" for group metadata
// GSI1PK: "CODE#{code}" for code-based lookups
// GSI1SK: "CODE#{code}"

// Group item structure:
// PK: "GROUP#{groupId}"
// SK: "GROUP#{groupId}"
// GSI1PK: "CODE#{code}"
// GSI1SK: "CODE#{code}"
// type: "GROUP"
// id: groupId
// code: groupCode
// name: groupName
// members: [array of members]
// createdAt: ISO string
// updatedAt: ISO string

// Get a specific group by ID
export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const command = new GetCommand({
      TableName: GROUPS_TABLE,
      Key: {
        PK: `GROUP#${groupId}`,
        SK: `GROUP#${groupId}`,
      },
    });

    const result = await dynamoClient.send(command);
    
    if (!result.Item) {
      return null;
    }

    return {
      id: result.Item.id,
      code: result.Item.code,
      name: result.Item.name,
      members: result.Item.members || [],
      createdAt: result.Item.createdAt,
      updatedAt: result.Item.updatedAt,
    };
  } catch (error) {
    console.error('Error getting group from DynamoDB:', error);
    throw new Error('Failed to retrieve group');
  }
}

// Get group by code using GSI
export async function getGroupByCode(code: string): Promise<Group | null> {
  try {
    const command = new ScanCommand({
      TableName: GROUPS_TABLE,
      FilterExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `CODE#${code}`,
      },
    });

    const result = await dynamoClient.send(command);
    
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const item = result.Items[0];
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      members: item.members || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  } catch (error) {
    console.error('Error getting group by code from DynamoDB:', error);
    throw new Error('Failed to retrieve group by code');
  }
}

// Save a group
export async function saveGroup(group: Group): Promise<void> {
  try {
    const command = new PutCommand({
      TableName: GROUPS_TABLE,
      Item: {
        PK: `GROUP#${group.id}`,
        SK: `GROUP#${group.id}`,
        GSI1PK: `CODE#${group.code}`,
        GSI1SK: `CODE#${group.code}`,
        type: 'GROUP',
        id: group.id,
        code: group.code,
        name: group.name,
        members: group.members,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
    });

    await dynamoClient.send(command);
  } catch (error) {
    console.error('Error saving group to DynamoDB:', error);
    throw new Error('Failed to save group');
  }
}

// Update a group (for partial updates)
export async function updateGroup(groupId: string, updates: Partial<Group>): Promise<void> {
  try {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression dynamically
    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'id' && value !== undefined) {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        
        updateExpression.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: GROUPS_TABLE,
      Key: {
        PK: `GROUP#${groupId}`,
        SK: `GROUP#${groupId}`,
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await dynamoClient.send(command);
  } catch (error) {
    console.error('Error updating group in DynamoDB:', error);
    throw new Error('Failed to update group');
  }
}

// Get all groups (for migration purposes)
export async function getAllGroups(): Promise<GroupStorage> {
  try {
    const command = new ScanCommand({
      TableName: GROUPS_TABLE,
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':type': 'GROUP',
      },
    });

    const result = await dynamoClient.send(command);
    
    const groups: GroupStorage = {};
    
    if (result.Items) {
      result.Items.forEach(item => {
        groups[item.id] = {
          id: item.id,
          code: item.code,
          name: item.name,
          members: item.members || [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });
    }

    return groups;
  } catch (error) {
    console.error('Error getting all groups from DynamoDB:', error);
    throw new Error('Failed to retrieve groups');
  }
}

// Delete a group
export async function deleteGroup(groupId: string): Promise<void> {
  try {
    const command = new DeleteCommand({
      TableName: GROUPS_TABLE,
      Key: {
        PK: `GROUP#${groupId}`,
        SK: `GROUP#${groupId}`,
      },
    });

    await dynamoClient.send(command);
  } catch (error) {
    console.error('Error deleting group from DynamoDB:', error);
    throw new Error('Failed to delete group');
  }
}
