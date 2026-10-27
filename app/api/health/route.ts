// GET /api/health: checks end to end (env, network, database) that Supabase responds.
// Error details are only logged on the server; the body is always { ok }.

import { createClient } from "@/lib/supabase/server";

type HealthResponse = { ok: true } | { ok: false };

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("health");
    if (error || data !== true) {
      console.error("[health] rpc failed", error ?? { data });
      return Response.json({ ok: false } satisfies HealthResponse, { status: 503, headers });
    }
    return Response.json({ ok: true } satisfies HealthResponse, { headers });
  } catch (err) {
    console.error("[health] unexpected error", err);
    return Response.json({ ok: false } satisfies HealthResponse, { status: 503, headers });
  }
}
