import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  ACMClient,
  RequestCertificateCommand,
  DescribeCertificateCommand,
  DeleteCertificateCommand,
} from "@aws-sdk/client-acm";
import {
  requestCertificate,
  describeCertificate,
  deleteCertificate,
} from "@/lib/aws/acm";

const acmMock = mockClient(ACMClient);

const fakeCreds = {
  accessKeyId: "ASIA_TEST",
  secretAccessKey: "secret",
  sessionToken: "token",
  expiration: new Date(),
};

beforeEach(() => {
  acmMock.reset();
});

describe("requestCertificate", () => {
  it("returns the certificate ARN", async () => {
    acmMock.on(RequestCertificateCommand).resolves({
      CertificateArn:
        "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
    });

    const arn = await requestCertificate(fakeCreds, "mysite.com");
    expect(arn).toBe(
      "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
    );

    const call = acmMock.commandCalls(RequestCertificateCommand)[0];
    expect(call.args[0].input).toMatchObject({
      DomainName: "mysite.com",
      ValidationMethod: "DNS",
    });
  });

  it("throws when no ARN is returned", async () => {
    acmMock
      .on(RequestCertificateCommand)
      .resolves({ CertificateArn: undefined });

    await expect(
      requestCertificate(fakeCreds, "mysite.com"),
    ).rejects.toThrow("RequestCertificate did not return a certificate ARN");
  });
});

describe("describeCertificate", () => {
  it("returns status and validation records", async () => {
    acmMock.on(DescribeCertificateCommand).resolves({
      Certificate: {
        Status: "PENDING_VALIDATION",
        DomainValidationOptions: [
          {
            DomainName: "mysite.com",
            ValidationStatus: "PENDING_VALIDATION",
            ResourceRecord: {
              Name: "_abc123.mysite.com",
              Type: "CNAME",
              Value: "_def456.acm-validations.aws.",
            },
          },
        ],
      },
    });

    const result = await describeCertificate(
      fakeCreds,
      "arn:aws:acm:us-east-1:123:certificate/abc",
    );

    expect(result.status).toBe("PENDING_VALIDATION");
    expect(result.validationRecords).toEqual([
      {
        name: "_abc123.mysite.com",
        value: "_def456.acm-validations.aws.",
      },
    ]);
  });

  it("returns ISSUED status without validation records", async () => {
    acmMock.on(DescribeCertificateCommand).resolves({
      Certificate: {
        Status: "ISSUED",
        DomainValidationOptions: [
          {
            DomainName: "mysite.com",
            ValidationStatus: "SUCCESS",
          },
        ],
      },
    });

    const result = await describeCertificate(
      fakeCreds,
      "arn:aws:acm:us-east-1:123:certificate/abc",
    );

    expect(result.status).toBe("ISSUED");
  });

  it("throws when certificate not found", async () => {
    acmMock
      .on(DescribeCertificateCommand)
      .resolves({ Certificate: undefined });

    await expect(
      describeCertificate(
        fakeCreds,
        "arn:aws:acm:us-east-1:123:certificate/abc",
      ),
    ).rejects.toThrow("Certificate not found");
  });
});

describe("deleteCertificate", () => {
  it("sends delete command", async () => {
    acmMock.on(DeleteCertificateCommand).resolves({});

    await deleteCertificate(
      fakeCreds,
      "arn:aws:acm:us-east-1:123:certificate/abc",
    );

    const calls = acmMock.commandCalls(DeleteCertificateCommand);
    expect(calls).toHaveLength(1);
  });
});
