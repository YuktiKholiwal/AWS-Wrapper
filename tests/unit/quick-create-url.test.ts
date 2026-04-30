import { describe, it, expect } from "vitest";
import { getQuickCreateUrl } from "@/lib/aws/quick-create-url";

describe("getQuickCreateUrl", () => {
  it("generates a valid CloudFormation Quick Create URL", () => {
    const url = getQuickCreateUrl("ext-abc123", "us-east-1");

    expect(url).toContain(
      "us-east-1.console.aws.amazon.com/cloudformation/home",
    );
    expect(url).toContain("region=us-east-1");
    expect(url).toContain("stackName=plot-iam-role-ext-abc123");
    expect(url).toContain("param_ExternalId=ext-abc123");
    expect(url).toContain("param_PlotAccountId=");
  });

  it("encodes the template URL", () => {
    const url = getQuickCreateUrl("ext-test", "eu-west-1");

    expect(url).toContain("templateURL=");
    expect(url).toContain("eu-west-1.console.aws.amazon.com");
  });
});
