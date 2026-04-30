import { env } from "@/lib/env";

const TEMPLATE_URL =
  "https://raw.githubusercontent.com/YuktiKholiwal/AWS-Wrapper/main/src/lib/aws/templates/iam-role.yml";

export function getQuickCreateUrl(externalId: string, region: string): string {
  const params = new URLSearchParams({
    templateURL: TEMPLATE_URL,
    stackName: `plot-iam-role-${externalId}`,
    param_PlotAccountId: env.AWS_ACCOUNT_ID,
    param_ExternalId: externalId,
  });

  return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/quickcreate?${params.toString()}`;
}
