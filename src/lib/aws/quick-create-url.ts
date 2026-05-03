import { env } from "@/lib/env";

export function getQuickCreateUrl(externalId: string, region: string): string {
  const params = new URLSearchParams({
    templateURL: env.CFN_TEMPLATE_URL,
    stackName: `plot-iam-role-${externalId}`,
    param_PlotAccountId: env.AWS_ACCOUNT_ID,
    param_ExternalId: externalId,
  });

  return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/quickcreate?${params.toString()}`;
}
