import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
} from "@aws-sdk/client-sts";
import { assumeRole, verifyConnection } from "@/lib/aws/assume-role";

const stsMock = mockClient(STSClient);

beforeEach(() => {
  stsMock.reset();
});

describe("assumeRole", () => {
  it("returns temporary credentials on success", async () => {
    const expiration = new Date("2026-05-01T00:00:00Z");
    stsMock.on(AssumeRoleCommand).resolves({
      Credentials: {
        AccessKeyId: "ASIA_TEST_KEY",
        SecretAccessKey: "test-secret",
        SessionToken: "test-token",
        Expiration: expiration,
      },
    });

    const result = await assumeRole(
      "arn:aws:iam::123456789012:role/test-role",
      "ext-123",
    );

    expect(result).toEqual({
      accessKeyId: "ASIA_TEST_KEY",
      secretAccessKey: "test-secret",
      sessionToken: "test-token",
      expiration,
    });

    const call = stsMock.commandCalls(AssumeRoleCommand)[0];
    expect(call.args[0].input).toMatchObject({
      RoleArn: "arn:aws:iam::123456789012:role/test-role",
      ExternalId: "ext-123",
      DurationSeconds: 3600,
    });
  });

  it("throws when credentials are incomplete", async () => {
    stsMock.on(AssumeRoleCommand).resolves({
      Credentials: {
        AccessKeyId: "ASIA_TEST_KEY",
        SecretAccessKey: undefined,
        SessionToken: undefined,
        Expiration: undefined,
      },
    });

    await expect(
      assumeRole("arn:aws:iam::123456789012:role/test-role", "ext-123"),
    ).rejects.toThrow("AssumeRole returned incomplete credentials");
  });

  it("throws when STS rejects the request", async () => {
    stsMock.on(AssumeRoleCommand).rejects(new Error("Access denied"));

    await expect(
      assumeRole("arn:aws:iam::123456789012:role/bad-role", "ext-bad"),
    ).rejects.toThrow("Access denied");
  });
});

describe("verifyConnection", () => {
  it("returns the account ID on success", async () => {
    stsMock.on(GetCallerIdentityCommand).resolves({
      Account: "123456789012",
      Arn: "arn:aws:sts::123456789012:assumed-role/test-role/session",
      UserId: "AROA_TEST:session",
    });

    const accountId = await verifyConnection({
      accessKeyId: "ASIA_TEST_KEY",
      secretAccessKey: "test-secret",
      sessionToken: "test-token",
      expiration: new Date(),
    });

    expect(accountId).toBe("123456789012");
  });

  it("throws when account ID is missing", async () => {
    stsMock.on(GetCallerIdentityCommand).resolves({
      Account: undefined,
    });

    await expect(
      verifyConnection({
        accessKeyId: "ASIA_TEST_KEY",
        secretAccessKey: "test-secret",
        sessionToken: "test-token",
        expiration: new Date(),
      }),
    ).rejects.toThrow("GetCallerIdentity did not return an account ID");
  });
});
