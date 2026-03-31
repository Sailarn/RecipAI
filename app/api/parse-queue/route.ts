import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { url, userComment } = await req.json();

  if (!url)
    return NextResponse.json({ error: "URL required" }, { status: 400 });

  const id = crypto.randomUUID();

  await db.insert(parseJobs).values({
    id,
    userId: session?.user.id ?? null,
    url,
    userComment: userComment || null,
    status: "pending",
  });

  return NextResponse.json({ jobId: id });
}
