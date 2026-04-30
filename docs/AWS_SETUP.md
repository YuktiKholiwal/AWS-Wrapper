# AWS Setup

## Plot Service Account

Plot needs an AWS account with an IAM user that can call `sts:AssumeRole`. This user assumes roles in customer accounts to manage their resources.

### IAM User: `plot-service`

**Permission:** A single inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "*"
    }
  ]
}
```

The access key ID and secret access key go into `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables.

## Cross-Account IAM Role (installed by users)

Users install a CloudFormation stack (`src/lib/aws/templates/iam-role.yml`) in their own AWS account. This creates an IAM role that:

- Trusts the Plot AWS account (via `AWS_ACCOUNT_ID`)
- Requires a per-user external ID (prevents confused deputy attacks)
- Grants permissions scoped to:
  - `cloudformation:*` on stacks named `plot-site-*`
  - `s3:*` on buckets named `plot-site-*`
  - `cloudfront:*`
  - `iam:CreateServiceLinkedRole` for CloudFront

### How it works

1. Plot generates a CloudFormation Quick Create URL with `PlotAccountId` and `ExternalId` prefilled
2. User opens the URL in their AWS Console and creates the stack
3. User copies the role ARN from the stack outputs back into Plot
4. Plot calls `sts:AssumeRole` with the role ARN and external ID to get temporary credentials
5. Plot calls `sts:GetCallerIdentity` to verify the connection
6. Temporary credentials are used in-memory and discarded — never stored
