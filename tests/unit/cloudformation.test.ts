import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudFormationClient,
  CreateStackCommand,
  DescribeStacksCommand,
  DeleteStackCommand,
} from "@aws-sdk/client-cloudformation";
import {
  deployStack,
  getStackStatus,
  deleteStack,
} from "@/lib/aws/cloudformation";

const cfnMock = mockClient(CloudFormationClient);

const fakeCreds = {
  accessKeyId: "ASIA_TEST",
  secretAccessKey: "secret",
  sessionToken: "token",
  expiration: new Date(),
};

beforeEach(() => {
  cfnMock.reset();
});

describe("deployStack", () => {
  it("creates a stack and returns the stack ID", async () => {
    cfnMock.on(CreateStackCommand).resolves({
      StackId: "arn:aws:cloudformation:us-east-1:123:stack/test/abc",
    });

    const stackId = await deployStack(
      fakeCreds,
      "us-east-1",
      "plot-site-test",
      "template-body",
      { SiteName: "test" },
    );

    expect(stackId).toBe(
      "arn:aws:cloudformation:us-east-1:123:stack/test/abc",
    );

    const call = cfnMock.commandCalls(CreateStackCommand)[0];
    expect(call.args[0].input).toMatchObject({
      StackName: "plot-site-test",
      TemplateBody: "template-body",
    });
  });

  it("throws when no stack ID is returned", async () => {
    cfnMock.on(CreateStackCommand).resolves({ StackId: undefined });

    await expect(
      deployStack(fakeCreds, "us-east-1", "plot-site-test", "body", {}),
    ).rejects.toThrow("CreateStack did not return a stack ID");
  });
});

describe("getStackStatus", () => {
  it("returns CREATE_IN_PROGRESS status", async () => {
    cfnMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: "plot-site-test",
          StackStatus: "CREATE_IN_PROGRESS",
          CreationTime: new Date(),
        },
      ],
    });

    const result = await getStackStatus(
      fakeCreds,
      "us-east-1",
      "plot-site-test",
    );

    expect(result.status).toBe("CREATE_IN_PROGRESS");
    expect(result.outputs).toBeUndefined();
  });

  it("returns outputs on CREATE_COMPLETE", async () => {
    cfnMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: "plot-site-test",
          StackStatus: "CREATE_COMPLETE",
          CreationTime: new Date(),
          Outputs: [
            { OutputKey: "BucketName", OutputValue: "plot-site-test" },
            { OutputKey: "DistributionId", OutputValue: "E1234" },
            {
              OutputKey: "DistributionDomainName",
              OutputValue: "d1234.cloudfront.net",
            },
          ],
        },
      ],
    });

    const result = await getStackStatus(
      fakeCreds,
      "us-east-1",
      "plot-site-test",
    );

    expect(result.status).toBe("CREATE_COMPLETE");
    expect(result.outputs).toEqual({
      bucketName: "plot-site-test",
      distributionId: "E1234",
      distributionDomainName: "d1234.cloudfront.net",
    });
  });

  it("returns reason on failure", async () => {
    cfnMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: "plot-site-test",
          StackStatus: "ROLLBACK_COMPLETE",
          CreationTime: new Date(),
          StackStatusReason: "Resource creation cancelled",
        },
      ],
    });

    const result = await getStackStatus(
      fakeCreds,
      "us-east-1",
      "plot-site-test",
    );

    expect(result.status).toBe("ROLLBACK_COMPLETE");
    expect(result.reason).toBe("Resource creation cancelled");
  });

  it("throws when stack not found", async () => {
    cfnMock.on(DescribeStacksCommand).resolves({ Stacks: [] });

    await expect(
      getStackStatus(fakeCreds, "us-east-1", "plot-site-test"),
    ).rejects.toThrow("Stack plot-site-test not found");
  });
});

describe("deleteStack", () => {
  it("sends delete command", async () => {
    cfnMock.on(DeleteStackCommand).resolves({});

    await deleteStack(fakeCreds, "us-east-1", "plot-site-test");

    const calls = cfnMock.commandCalls(DeleteStackCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input.StackName).toBe("plot-site-test");
  });
});
