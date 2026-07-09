import { and, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { generateApiKey } from "@/server/keys/generate";
import { db } from "./index";
import { apiKey, scope, service, tier, user } from "./schema";

const DEMO_EMAIL = "demo@keys.local";
const DEMO_PASSWORD = "demo-password-123";
const DEMO_NAME = "Demo Owner";
const SAMPLE_KEY_NAME = "Sample Live Key";
const SAMPLE_KEY_SCOPES = ["links:read", "links:write"];

async function ensureOwner(): Promise<string> {
  const existing = await db.query.user.findFirst({
    where: eq(user.email, DEMO_EMAIL),
  });
  if (existing) {
    return existing.id;
  }

  const result = await auth.api.signUpEmail({
    body: { email: DEMO_EMAIL, name: DEMO_NAME, password: DEMO_PASSWORD },
  });
  return result.user.id;
}

async function ensureTier(
  ownerId: string,
  name: string,
  rateLimitPerMin: number
): Promise<string> {
  const existing = await db.query.tier.findFirst({
    where: and(eq(tier.ownerId, ownerId), eq(tier.name, name)),
  });
  if (existing) {
    return existing.id;
  }
  const [row] = await db
    .insert(tier)
    .values({ name, ownerId, rateLimitPerMin })
    .returning();
  return row.id;
}

async function ensureService(
  ownerId: string,
  name: string,
  slug: string,
  description: string
): Promise<string> {
  const existing = await db.query.service.findFirst({
    where: and(eq(service.ownerId, ownerId), eq(service.slug, slug)),
  });
  if (existing) {
    return existing.id;
  }
  const [row] = await db
    .insert(service)
    .values({ description, name, ownerId, slug })
    .returning();
  return row.id;
}

async function ensureScope(
  serviceId: string,
  value: string,
  description: string
): Promise<void> {
  await db
    .insert(scope)
    .values({ description, serviceId, value })
    .onConflictDoNothing({ target: [scope.serviceId, scope.value] });
}

async function ensureSampleKey(
  ownerId: string,
  serviceId: string,
  tierId: string
): Promise<string | null> {
  const existing = await db.query.apiKey.findFirst({
    where: and(
      eq(apiKey.serviceId, serviceId),
      eq(apiKey.name, SAMPLE_KEY_NAME)
    ),
  });
  if (existing) {
    return null;
  }

  const generated = generateApiKey("live");
  await db.insert(apiKey).values({
    displayPrefix: generated.displayPrefix,
    environment: "live",
    keyHash: generated.keyHash,
    last4: generated.last4,
    name: SAMPLE_KEY_NAME,
    ownerId,
    publicId: generated.publicId,
    scopes: SAMPLE_KEY_SCOPES,
    serviceId,
    tierId,
  });
  return generated.fullKey;
}

async function main() {
  const ownerId = await ensureOwner();

  const freeTierId = await ensureTier(ownerId, "Free", 60);
  const proTierId = await ensureTier(ownerId, "Pro", 1000);

  const shortenerId = await ensureService(
    ownerId,
    "URL Shortener",
    "url-shortener",
    "Demo service: shorten and redirect URLs."
  );
  await ensureScope(shortenerId, "links:read", "List short links.");
  await ensureScope(shortenerId, "links:write", "Create short links.");

  const invoicesId = await ensureService(
    ownerId,
    "Invoices",
    "invoices",
    "Demo service: mock invoicing API."
  );
  await ensureScope(invoicesId, "invoices:read", "List invoices.");
  await ensureScope(invoicesId, "invoices:write", "Create invoices.");

  const sampleKey = await ensureSampleKey(ownerId, shortenerId, freeTierId);

  console.log("seed complete");
  console.log(`  owner:    ${DEMO_EMAIL} / ${DEMO_PASSWORD} (id ${ownerId})`);
  console.log(`  tiers:    Free=${freeTierId} Pro=${proTierId}`);
  console.log(
    `  services: url-shortener=${shortenerId} invoices=${invoicesId}`
  );
  if (sampleKey) {
    console.log(`  sample key (save now — unrecoverable): ${sampleKey}`);
  } else {
    console.log(
      "  sample key: already exists (plaintext shown only on first seed)"
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("seed failed:", error);
    process.exit(1);
  });
