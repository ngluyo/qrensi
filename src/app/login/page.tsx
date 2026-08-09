"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, LogIn, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "";
  const initialError = params.get("error") === "bukan_admin" ? "Akun ini bukan admin." : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email atau kata sandi salah.");
      setLoading(false);
      return;
    }
    // Tentukan tujuan: pakai `next` bila ada, else ke beranda; server akan
    // mengarahkan admin sesuai peran saat mengakses.
    router.replace(next || "/beranda");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-semibold" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          placeholder="nama@instansi.go.id"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold" htmlFor="password">Kata sandi</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-bold text-brand-fg disabled:opacity-60"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
        Masuk
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Masuk ke QRensi</h1>
          <p className="mt-1 text-sm text-muted">Presensi ASN Kotabaru</p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-muted">Memuat…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
