# Manual Testing — Phase 1

## AWS Connection Flow

### Prerequisites

- A separate AWS account (the "user" account, not the Plot service account)
- Plot running locally with `pnpm dev`
- Signed in via Clerk

### Happy path

1. Navigate to `/connect`
2. Click "Open AWS CloudFormation" — this opens the Quick Create URL in the user AWS account
3. In AWS Console:
   - Verify the stack name is `plot-iam-role-<uuid>`
   - Verify `PlotAccountId` and `ExternalId` parameters are prefilled
   - Check "I acknowledge that AWS CloudFormation might create IAM resources"
   - Click "Create stack"
   - Wait for `CREATE_COMPLETE`
4. Go to the stack Outputs tab, copy the `RoleArn` value
5. Back in Plot, paste the Role ARN and click "Connect"
6. Verify: you're redirected to `/sites` and see the empty state
7. Navigate to `/connect` — verify it shows the connected state with account ID, region, role ARN

### Disconnect

8. Click "Disconnect" — verify it returns to the connect form
9. Navigate to `/sites` — verify it redirects to `/connect` (no connection)

### Failure modes

- Submit a fake ARN (`arn:aws:iam::000000000000:role/fake`) without creating a stack — should show an error message, not crash
- Submit a valid ARN but with the wrong region format (e.g. `invalid`) — should show a validation error
- Refresh the `/connect` page after creating the CFN stack but before submitting — the Quick Create URL changes (new externalId), so the old stack's role won't work. User must delete the old stack and re-create with the new URL.

### Auth redirects

- Sign out and visit `/connect` — should redirect to sign-in
- Sign out and visit `/sites` — should redirect to sign-in

### Cleanup

- In the user AWS account, delete the CloudFormation stack `plot-iam-role-<uuid>`
