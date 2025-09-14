export async function recordEventToDynamo(params: {
  groupId: string;
  event: { id: string; title: string; start: string; end: string };
}) {
  const { DDB_TABLE, AWS_REGION, DDB_ENABLE } = process.env;
  if (!DDB_ENABLE || DDB_ENABLE !== 'true') return { ok: false, skipped: 'DynamoDB disabled' };
  if (!DDB_TABLE || !AWS_REGION) return { ok: false, skipped: 'No DynamoDB config' };
  // To enable AWS writes, install @aws-sdk/client-dynamodb and replace this stub with SDK logic.
  // Stubbed to avoid bundler import errors when SDK is not installed.
  return { ok: false, skipped: 'DynamoDB SDK not wired in this build' };
}
