import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getSite, updateSite } from "@/lib/db/queries/sites";
import { assumeRole } from "@/lib/aws/assume-role";
import {
  requestCertificate,
  describeCertificate,
  deleteCertificate,
} from "@/lib/aws/acm";
import { updateStack } from "@/lib/aws/cloudformation";
import { staticSiteTemplate } from "@/lib/aws/templates/static-site";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const domainSchema = z.object({
  domain: z
    .string()
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/,
      "Invalid domain format",
    ),
});

export async function POST(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const site = await getSite(id, userId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (site.status !== "live") {
    return NextResponse.json(
      { error: "Site must be live before adding a domain" },
      { status: 400 },
    );
  }

  if (site.domainStatus !== "none") {
    return NextResponse.json(
      { error: "A domain is already configured" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const parsed = domainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid domain", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const connection = await getAwsConnection(userId);
  if (!connection) {
    return NextResponse.json(
      { error: "No account connection found" },
      { status: 400 },
    );
  }

  try {
    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    const certificateArn = await requestCertificate(
      credentials,
      parsed.data.domain,
    );

    let validationCname: string | null = null;
    let validationValue: string | null = null;

    try {
      const certStatus = await describeCertificate(
        credentials,
        certificateArn,
      );
      if (certStatus.validationRecords?.[0]) {
        validationCname = certStatus.validationRecords[0].name;
        validationValue = certStatus.validationRecords[0].value;
      }
    } catch {
      // Validation records may not be ready yet — polling will pick them up
    }

    const updated = await updateSite(site.id, {
      customDomain: parsed.data.domain,
      domainStatus: "pending_validation",
      certificateArn,
      validationCname,
      validationValue,
    });

    return NextResponse.json({
      site: updated,
      validationRecord: validationCname
        ? { name: validationCname, value: validationValue }
        : null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to request certificate";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const site = await getSite(id, userId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (site.domainStatus === "none" || !site.certificateArn) {
    return NextResponse.json({ site });
  }

  const connection = await getAwsConnection(userId);
  if (!connection) {
    return NextResponse.json({ site });
  }

  try {
    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    const certStatus = await describeCertificate(
      credentials,
      site.certificateArn,
    );

    if (
      !site.validationCname &&
      certStatus.validationRecords?.[0]
    ) {
      await updateSite(site.id, {
        validationCname: certStatus.validationRecords[0].name,
        validationValue: certStatus.validationRecords[0].value,
      });
    }

    if (certStatus.status === "ISSUED" && site.domainStatus !== "active") {
      await updateStack(
        credentials,
        connection.region,
        site.stackName,
        staticSiteTemplate,
        {
          SiteName: site.id,
          CustomDomain: site.customDomain ?? "",
          CertificateArn: site.certificateArn,
        },
      );

      const updated = await updateSite(site.id, {
        domainStatus: "active",
      });
      return NextResponse.json({ site: updated });
    }

    if (certStatus.status === "FAILED") {
      const updated = await updateSite(site.id, {
        domainStatus: "failed",
      });
      return NextResponse.json({ site: updated });
    }

    const refreshed = await getSite(id, userId);
    return NextResponse.json({ site: refreshed });
  } catch {
    return NextResponse.json({ site });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const site = await getSite(id, userId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (site.domainStatus === "none") {
    return NextResponse.json(
      { error: "No domain configured" },
      { status: 400 },
    );
  }

  const connection = await getAwsConnection(userId);
  if (!connection) {
    return NextResponse.json(
      { error: "No account connection found" },
      { status: 400 },
    );
  }

  try {
    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    if (site.domainStatus === "active") {
      await updateStack(
        credentials,
        connection.region,
        site.stackName,
        staticSiteTemplate,
        {
          SiteName: site.id,
          CustomDomain: "",
          CertificateArn: "",
        },
      );
    }

    if (site.certificateArn) {
      try {
        await deleteCertificate(credentials, site.certificateArn);
      } catch {
        // Certificate may already be deleted or in use — continue cleanup
      }
    }

    await updateSite(site.id, {
      customDomain: null,
      domainStatus: "none",
      certificateArn: null,
      validationCname: null,
      validationValue: null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove domain";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
