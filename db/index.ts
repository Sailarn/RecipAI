import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL ?? "", {
  // Required by Supabase's transaction pooler (port 6543) — see docs/reference/env.md.
  prepare: false,
  // The pooler multiplexes on its side, so a per-instance pool this small buys
  // nothing and costs throughput: with Fluid Compute reusing one instance
  // across concurrent requests, max: 1 serialised every query in the process
  // behind a single connection.
  max: 5,
  // Hand connections back to the pooler rather than holding them open across
  // idle periods on a long-lived instance (the Pi, a warm Fluid instance).
  idle_timeout: 20,
});
export const db = drizzle(client);
