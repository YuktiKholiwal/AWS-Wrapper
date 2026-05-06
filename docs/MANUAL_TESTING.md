# Manual Testing

## Phase 2 — Static Site Deploy

### Prerequisites

- AWS account connected (Phase 1 complete)
- Plot running locally with `pnpm dev`
- A folder with a static site (at minimum an `index.html`)

### Deploy a static site

1. Navigate to `/sites` — click "New Site"
2. Enter a site name (lowercase, hyphens OK, e.g. `my-test-site`)
3. Drag and drop your static site folder (or click "Select a folder")
4. Verify the file list shows your files
5. Click "Deploy"
6. Wait for provisioning (5-15 minutes for CloudFront). The status page polls automatically.
7. Once status changes to "live", you'll be redirected to the site detail page
8. Click the CloudFront URL — your site should load

### Redeploy

1. On the site detail page, select a new folder under "Redeploy"
2. Click "Redeploy" — files upload to S3 and CloudFront is invalidated
3. Wait a few minutes for CloudFront cache to clear, then verify new content

### Delete a site

1. On the site detail page, click "Delete Site"
2. Confirm the deletion
3. Verify you're redirected to `/sites`
4. In AWS Console, verify the CloudFormation stack `plot-site-<id>` is deleted
5. Verify the S3 bucket is gone

### Failure modes

- Create a site with invalid name (uppercase, special chars) — should show validation error
- Try to deploy without selecting files — should show error
- Delete a site while it's still provisioning — should still clean up

---

## Phase 1 — AWS Connection

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
