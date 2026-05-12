import {
  CloudFormationClient,
  CreateStackCommand,
  DescribeStacksCommand,
  DeleteStackCommand,
  UpdateStackCommand,
} from "@aws-sdk/client-cloudformation";
import type { AwsTempCredentials } from "@/lib/aws/assume-role";

export interface StackOutputs {
  bucketName: string;
  distributionId: string;
  distributionDomainName: string;
}

export type CfnStackStatus =
  | "CREATE_IN_PROGRESS"
  | "CREATE_COMPLETE"
  | "CREATE_FAILED"
  | "ROLLBACK_IN_PROGRESS"
  | "ROLLBACK_COMPLETE"
  | "DELETE_IN_PROGRESS"
  | "DELETE_COMPLETE"
  | "DELETE_FAILED"
  | "UPDATE_IN_PROGRESS"
  | "UPDATE_COMPLETE"
  | "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS"
  | "UPDATE_FAILED"
  | "UPDATE_ROLLBACK_IN_PROGRESS"
  | "UPDATE_ROLLBACK_COMPLETE";

export interface StackStatusResult {
  status: CfnStackStatus;
  outputs?: StackOutputs;
  reason?: string;
}

function getCfnClient(
  credentials: AwsTempCredentials,
  region: string,
): CloudFormationClient {
  return new CloudFormationClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

export async function deployStack(
  credentials: AwsTempCredentials,
  region: string,
  stackName: string,
  templateBody: string,
  parameters: Record<string, string>,
): Promise<string> {
  const client = getCfnClient(credentials, region);

  const response = await client.send(
    new CreateStackCommand({
      StackName: stackName,
      TemplateBody: templateBody,
      Parameters: Object.entries(parameters).map(([key, value]) => ({
        ParameterKey: key,
        ParameterValue: value,
      })),
      Capabilities: ["CAPABILITY_NAMED_IAM"],
    }),
  );

  if (!response.StackId) {
    throw new Error("CreateStack did not return a stack ID");
  }

  return response.StackId;
}

export async function getStackStatus(
  credentials: AwsTempCredentials,
  region: string,
  stackName: string,
): Promise<StackStatusResult> {
  const client = getCfnClient(credentials, region);

  const response = await client.send(
    new DescribeStacksCommand({ StackName: stackName }),
  );

  const stack = response.Stacks?.[0];
  if (!stack?.StackStatus) {
    throw new Error(`Stack ${stackName} not found`);
  }

  const status = stack.StackStatus as CfnStackStatus;
  const result: StackStatusResult = { status };

  if (
    (status === "CREATE_COMPLETE" || status === "UPDATE_COMPLETE") &&
    stack.Outputs
  ) {
    const getOutput = (key: string) =>
      stack.Outputs?.find((o) => o.OutputKey === key)?.OutputValue ?? "";

    result.outputs = {
      bucketName: getOutput("BucketName"),
      distributionId: getOutput("DistributionId"),
      distributionDomainName: getOutput("DistributionDomainName"),
    };
  }

  if (
    status === "CREATE_FAILED" ||
    status === "ROLLBACK_COMPLETE" ||
    status === "ROLLBACK_IN_PROGRESS" ||
    status === "UPDATE_FAILED" ||
    status === "UPDATE_ROLLBACK_COMPLETE"
  ) {
    result.reason = stack.StackStatusReason ?? "Unknown failure";
  }

  return result;
}

export async function updateStack(
  credentials: AwsTempCredentials,
  region: string,
  stackName: string,
  templateBody: string,
  parameters: Record<string, string>,
): Promise<string> {
  const client = getCfnClient(credentials, region);

  const response = await client.send(
    new UpdateStackCommand({
      StackName: stackName,
      TemplateBody: templateBody,
      Parameters: Object.entries(parameters).map(([key, value]) => ({
        ParameterKey: key,
        ParameterValue: value,
      })),
      Capabilities: ["CAPABILITY_NAMED_IAM"],
    }),
  );

  if (!response.StackId) {
    throw new Error("UpdateStack did not return a stack ID");
  }

  return response.StackId;
}

export async function deleteStack(
  credentials: AwsTempCredentials,
  region: string,
  stackName: string,
): Promise<void> {
  const client = getCfnClient(credentials, region);

  await client.send(new DeleteStackCommand({ StackName: stackName }));
}
