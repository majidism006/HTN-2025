import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Validate AWS credentials
function validateCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
    );
  }

  if (!region) {
    console.warn('AWS_REGION not set, defaulting to us-east-1');
  }

  return { accessKeyId, secretAccessKey, region: region || 'us-east-1' };
}

// Create DynamoDB client with proper error handling
let client: DynamoDBClient;
try {
  const { accessKeyId, secretAccessKey, region } = validateCredentials();
  
  client = new DynamoDBClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
} catch (error) {
  console.error('Failed to initialize DynamoDB client:', error);
  throw error;
}

// Create DynamoDB Document Client for easier JSON operations
export const dynamoClient = DynamoDBDocumentClient.from(client);

// Table name
export const GROUPS_TABLE = process.env.DYNAMODB_GROUPS_TABLE || 'synchrosched-groups';
