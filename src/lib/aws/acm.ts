import {
  ACMClient,
  RequestCertificateCommand,
  DescribeCertificateCommand,
  DeleteCertificateCommand,
} from "@aws-sdk/client-acm";
import type { AwsTempCredentials } from "@/lib/aws/assume-role";

export interface CertificateValidationRecord {
  name: string;
  value: string;
}

export interface CertificateStatus {
  status: string;
  validationRecords?: CertificateValidationRecord[];
}

function getAcmClient(credentials: AwsTempCredentials): ACMClient {
  return new ACMClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

export async function requestCertificate(
  credentials: AwsTempCredentials,
  domain: string,
): Promise<string> {
  const client = getAcmClient(credentials);

  const response = await client.send(
    new RequestCertificateCommand({
      DomainName: domain,
      ValidationMethod: "DNS",
    }),
  );

  if (!response.CertificateArn) {
    throw new Error("RequestCertificate did not return a certificate ARN");
  }

  return response.CertificateArn;
}

export async function describeCertificate(
  credentials: AwsTempCredentials,
  certificateArn: string,
): Promise<CertificateStatus> {
  const client = getAcmClient(credentials);

  const response = await client.send(
    new DescribeCertificateCommand({ CertificateArn: certificateArn }),
  );

  const cert = response.Certificate;
  if (!cert) {
    throw new Error("Certificate not found");
  }

  const result: CertificateStatus = {
    status: cert.Status ?? "UNKNOWN",
  };

  const validation = cert.DomainValidationOptions?.[0];
  if (validation?.ResourceRecord) {
    result.validationRecords = [
      {
        name: validation.ResourceRecord.Name ?? "",
        value: validation.ResourceRecord.Value ?? "",
      },
    ];
  }

  return result;
}

export async function deleteCertificate(
  credentials: AwsTempCredentials,
  certificateArn: string,
): Promise<void> {
  const client = getAcmClient(credentials);

  await client.send(
    new DeleteCertificateCommand({ CertificateArn: certificateArn }),
  );
}
