import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import type { AwsTempCredentials } from "@/lib/aws/assume-role";

export async function invalidateDistribution(
  credentials: AwsTempCredentials,
  region: string,
  distributionId: string,
): Promise<void> {
  const client = new CloudFrontClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  await client.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `plot-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: ["/*"],
        },
      },
    }),
  );
}
