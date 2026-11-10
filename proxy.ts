// Next 16 proxy (formerly middleware): refreshes the Supabase session on every
// page request. No route requires a session, so it never redirects.
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
export async function proxy(request: NextRequest) {
  return updateSession(request);
}
export const config = {
  matcher: [
    // Everything except static assets, image optimization, the favicon and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
