import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import type { AwsTempCredentials } from "@/lib/aws/assume-role";

export interface LogEvent {
  timestamp: number;
  message: string;
}

export async function getFunctionLogs(
  credentials: AwsTempCredentials,
  region: string,
  functionName: string,
  limit: number = 50,
): Promise<LogEvent[]> {
  const client = new CloudWatchLogsClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const logGroupName = `/aws/lambda/${functionName}`;

  try {
    const response = await client.send(
      new FilterLogEventsCommand({
        logGroupName,
        limit,
        interleaved: true,
      }),
    );

    return (response.events ?? [])
      .filter((e) => e.timestamp && e.message)
      .map((e) => ({
        timestamp: e.timestamp!,
        message: e.message!.trim(),
      }));
  } catch (err) {
    if (
      err instanceof Error &&
      err.name === "ResourceNotFoundException"
    ) {
      return [];
    }
    throw err;
  }
}
