import { relations, sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// biome-ignore lint/performance/noBarrelFile: barrel file
export * from "./auth-schema";

const primaryId = () => uuid("id").primaryKey().default(sql`uuidv7()`);

export const service = pgTable(
  "service",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    id: primaryId(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
  },
  (t) => [
    index("service_owner_idx").on(t.ownerId),
    uniqueIndex("service_owner_slug_idx").on(t.ownerId, t.slug),
  ]
);

export const scope = pgTable(
  "scope",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    id: primaryId(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
  },
  (t) => [uniqueIndex("scope_service_value_idx").on(t.serviceId, t.value)]
);

export const tier = pgTable(
  "tier",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: primaryId(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rateLimitPerMin: integer("rate_limit_per_min").notNull(),
  },
  (t) => [index("tier_owner_idx").on(t.ownerId)]
);

export const apiKey = pgTable(
  "api_key",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    displayPrefix: text("display_prefix").notNull(),
    environment: text("environment", { enum: ["live", "test"] })
      .notNull()
      .default("test"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    id: primaryId(),
    keyHash: text("key_hash").notNull(),
    keyType: text("key_type", { enum: ["standard", "root"] })
      .notNull()
      .default("standard"),
    last4: text("last4").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    scopes: text("scopes").array().notNull().default(sql`ARRAY[]::text[]`),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["active", "revoked"] })
      .notNull()
      .default("active"),
    tierId: uuid("tier_id")
      .notNull()
      .references(() => tier.id, { onDelete: "restrict" }),
    usageCount: bigint("usage_count", { mode: "number" }).notNull().default(0),
  },
  (t) => [
    index("api_key_owner_idx").on(t.ownerId),
    index("api_key_service_idx").on(t.serviceId),
    index("api_key_tier_idx").on(t.tierId),
    uniqueIndex("api_key_public_id_idx").on(t.publicId),
    index("api_key_status_idx").on(t.status),
  ]
);

export const auditLog = pgTable(
  "audit_log",
  {
    action: text("action").notNull(),
    apiKeyId: uuid("api_key_id").references(() => apiKey.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: primaryId(),
    metadata: jsonb("metadata"),
    ownerId: text("owner_id").references(() => user.id, {
      onDelete: "set null",
    }),
    serviceId: uuid("service_id").references(() => service.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("audit_key_idx").on(t.apiKeyId),
    index("audit_owner_idx").on(t.ownerId),
    index("audit_service_idx").on(t.serviceId),
    index("audit_created_idx").on(t.createdAt),
  ]
);

export const shortLink = pgTable(
  "short_link",
  {
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKey.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    hits: bigint("hits", { mode: "number" }).notNull().default(0),
    id: primaryId(),
    slug: text("slug").notNull().unique(),
    targetUrl: text("target_url").notNull(),
  },
  (t) => [index("short_link_api_key_idx").on(t.apiKeyId)]
);

export const invoice = pgTable(
  "invoice",
  {
    amountCents: integer("amount_cents").notNull(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKey.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currency: text("currency").notNull().default("USD"),
    id: primaryId(),
    number: text("number").notNull(),
    status: text("status", { enum: ["draft", "sent", "paid"] })
      .notNull()
      .default("draft"),
  },
  (t) => [index("invoice_api_key_idx").on(t.apiKeyId)]
);

export const serviceRelations = relations(service, ({ one, many }) => ({
  apiKeys: many(apiKey),
  owner: one(user, { fields: [service.ownerId], references: [user.id] }),
  scopes: many(scope),
}));

export const scopeRelations = relations(scope, ({ one }) => ({
  service: one(service, {
    fields: [scope.serviceId],
    references: [service.id],
  }),
}));

export const tierRelations = relations(tier, ({ one, many }) => ({
  apiKeys: many(apiKey),
  owner: one(user, { fields: [tier.ownerId], references: [user.id] }),
}));

export const apiKeyRelations = relations(apiKey, ({ one, many }) => ({
  invoices: many(invoice),
  owner: one(user, { fields: [apiKey.ownerId], references: [user.id] }),
  service: one(service, {
    fields: [apiKey.serviceId],
    references: [service.id],
  }),
  shortLinks: many(shortLink),
  tier: one(tier, { fields: [apiKey.tierId], references: [tier.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  apiKey: one(apiKey, {
    fields: [auditLog.apiKeyId],
    references: [apiKey.id],
  }),
  owner: one(user, { fields: [auditLog.ownerId], references: [user.id] }),
  service: one(service, {
    fields: [auditLog.serviceId],
    references: [service.id],
  }),
}));

export const shortLinkRelations = relations(shortLink, ({ one }) => ({
  apiKey: one(apiKey, {
    fields: [shortLink.apiKeyId],
    references: [apiKey.id],
  }),
}));

export const invoiceRelations = relations(invoice, ({ one }) => ({
  apiKey: one(apiKey, {
    fields: [invoice.apiKeyId],
    references: [apiKey.id],
  }),
}));
