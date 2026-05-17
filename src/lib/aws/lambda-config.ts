import {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import type { AwsTempCredentials } from "@/lib/aws/assume-role";

export async function updateFunctionEnvVars(
  credentials: AwsTempCredentials,
  region: string,
  functionName: string,
  envVars: Record<string, string>,
): Promise<void> {
  const client = new LambdaClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  await client.send(
    new UpdateFunctionConfigurationCommand({
      FunctionName: functionName,
      Environment: {
        Variables: envVars,
      },
    }),
  );
}
