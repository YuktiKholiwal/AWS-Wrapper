import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const siteStatusEnum = pgEnum("site_status", [
  "pending",
  "provisioning",
  "live",
  "failed",
  "deleting",
]);

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "uploading",
  "deploying",
  "live",
  "failed",
]);

export const domainStatusEnum = pgEnum("domain_status", [
  "none",
  "pending_validation",
  "validating",
  "active",
  "failed",
]);

export const awsConnections = pgTable("aws_connections", {
  userId: text("user_id").primaryKey(),
  roleArn: text("role_arn").notNull(),
  externalId: text("external_id").notNull(),
  awsAccountId: text("aws_account_id").notNull(),
  region: text("region").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sites = pgTable("sites", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  stackName: text("stack_name").notNull().unique(),
  cloudfrontUrl: text("cloudfront_url"),
  bucketName: text("bucket_name"),
  distributionId: text("distribution_id"),
  status: siteStatusEnum("status").notNull().default("pending"),
  customDomain: text("custom_domain"),
  domainStatus: domainStatusEnum("domain_status").notNull().default("none"),
  certificateArn: text("certificate_arn"),
  validationCname: text("validation_cname"),
  validationValue: text("validation_value"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const deployments = pgTable("deployments", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  status: deploymentStatusEnum("status").notNull().default("uploading"),
  fileCount: integer("file_count"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});
