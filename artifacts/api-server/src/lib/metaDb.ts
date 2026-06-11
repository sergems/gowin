import { eq } from "drizzle-orm";
import { createDb, settingsTable } from "@workspace/db";

// This DB instance ALWAYS points to the default DATABASE_URL — never switched.
// Used exclusively to persist the custom DB connection URL across restarts.
const { db: metaDb } = createDb(process.env.DATABASE_URL!);

export const CUSTOM_DB_KEY = "custom_db_url";
export const CUSTOM_DB_LABEL_KEY = "custom_db_label";

export async function getMetaSetting(key: string): Promise<string | null> {
  const [row] = await metaDb.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

export async function setMetaSetting(key: string, value: string): Promise<void> {
  await metaDb
    .insert(settingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

export async function deleteMetaSetting(key: string): Promise<void> {
  await metaDb.delete(settingsTable).where(eq(settingsTable.key, key));
}
