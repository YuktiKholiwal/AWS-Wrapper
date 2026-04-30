import {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
} from "@aws-sdk/client-sts";
import { env } from "@/lib/env";

export interface AwsTempCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}

function getStsClient(): STSClient {
  return new STSClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

export async function assumeRole(
  roleArn: string,
  externalId: string,
): Promise<AwsTempCredentials> {
  const client = getStsClient();

  const response = await client.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      ExternalId: externalId,
      RoleSessionName: `plot-session-${Date.now()}`,
      DurationSeconds: 3600,
    }),
  );

  const creds = response.Credentials;
  if (!creds?.AccessKeyId || !creds.SecretAccessKey || !creds.SessionToken) {
    throw new Error("AssumeRole returned incomplete credentials");
  }

  return {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken: creds.SessionToken,
    expiration: creds.Expiration ?? new Date(Date.now() + 3600 * 1000),
  };
}

export async function verifyConnection(
  credentials: AwsTempCredentials,
): Promise<string> {
  const client = new STSClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const response = await client.send(new GetCallerIdentityCommand({}));
  if (!response.Account) {
    throw new Error("GetCallerIdentity did not return an account ID");
  }

  return response.Account;
}
