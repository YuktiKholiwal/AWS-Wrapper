import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { invalidateDistribution } from "@/lib/aws/cloudfront";

const cfMock = mockClient(CloudFrontClient);

const fakeCreds = {
  accessKeyId: "ASIA_TEST",
  secretAccessKey: "secret",
  sessionToken: "token",
  expiration: new Date(),
};

beforeEach(() => {
  cfMock.reset();
});

describe("invalidateDistribution", () => {
  it("creates an invalidation for /*", async () => {
    cfMock.on(CreateInvalidationCommand).resolves({});

    await invalidateDistribution(fakeCreds, "us-east-1", "E1234");

    const calls = cfMock.commandCalls(CreateInvalidationCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      DistributionId: "E1234",
      InvalidationBatch: {
        Paths: {
          Quantity: 1,
          Items: ["/*"],
        },
      },
    });
  });
});
