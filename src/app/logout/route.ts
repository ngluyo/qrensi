import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Logout. WAJIB memakai status 303 (See Other): 307 (default NextResponse.redirect)
 * mempertahankan method POST sehingga browser mem-POST ke /login → 405. (AUDIT A1)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

// Dukung juga GET agar tautan biasa tetap bekerja.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
