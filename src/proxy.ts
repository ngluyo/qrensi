import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: konvensi "middleware" diganti "proxy".
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Jalankan di semua rute kecuali aset statis & gambar.
    "/((?!_next/static|_next/image|favicon.ico|icons|models|manifest.json|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};
