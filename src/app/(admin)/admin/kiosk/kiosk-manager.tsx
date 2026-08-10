"use client";

import { useActionState, useState } from "react";
import { registerKiosk, resetKioskSecret, setKioskAktif, deleteKiosk, type KioskActionState } from "./actions";
import { MonitorSmartphone, Plus, Copy, Check, KeyRound, Trash2, MapPin } from "lucide-react";

interface Kiosk {
  id: string;
  nama_perangkat: string;
  latitude: number;
  longitude: number;
  aktif: boolean;
  unit_kerja: { nama: string } | null;
}

const initial: KioskActionState = { ok: false };

export function KioskManager({
  kiosks,
  units,
}: {
  kiosks: Kiosk[];
  units: { id: string; nama: string }[];
}) {
  const [regState, regAction, regPending] = useActionState(registerKiosk, initial);
  const [resetState, resetAction] = useActionState(resetKioskSecret, initial);

  // Secret terbaru untuk ditampilkan sekali (dari register atau reset).
  const freshSecret = regState.secret
    ? { nama: regState.namaPerangkat, secret: regState.secret }
    : resetState.secret
      ? { nama: resetState.namaPerangkat, secret: resetState.secret }
      : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Perangkat Kiosk</h1>
        <p className="mt-1 text-sm text-muted">
          Kiosk menampilkan QR di kantor. Setiap kiosk punya <em>device secret</em> rahasia.
        </p>
      </header>

      {freshSecret && <SecretBanner nama={freshSecret.nama} secret={freshSecret.secret!} />}

      {/* Daftar kiosk */}
      <div className="space-y-2">
        {kiosks.map((k) => (
          <div key={k.id} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-3">
              <div
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  k.aktif ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted"
                }`}
              >
                <MonitorSmartphone className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{k.nama_perangkat}</div>
                <div className="tabular flex items-center gap-1 truncate text-xs text-muted">
                  <MapPin className="size-3" />
                  {k.latitude.toFixed(5)}, {k.longitude.toFixed(5)}
                  {k.unit_kerja?.nama ? ` · ${k.unit_kerja.nama}` : ""}
                </div>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  k.aktif ? "bg-success-soft text-success" : "bg-surface-2 text-muted"
                }`}
              >
                {k.aktif ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={resetAction}>
                <input type="hidden" name="id" value={k.id} />
                <button className="pressable flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-semibold">
                  <KeyRound className="size-3.5" /> Reset secret
                </button>
              </form>
              <form action={setKioskAktif}>
                <input type="hidden" name="id" value={k.id} />
                <input type="hidden" name="aktif" value={(!k.aktif).toString()} />
                <button className="pressable rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-semibold">
                  {k.aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </form>
              <form action={deleteKiosk}>
                <input type="hidden" name="id" value={k.id} />
                <button className="pressable flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft">
                  <Trash2 className="size-3.5" /> Hapus
                </button>
              </form>
            </div>
          </div>
        ))}
        {kiosks.length === 0 && (
          <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            Belum ada kiosk terdaftar.
          </p>
        )}
      </div>

      {/* Registrasi kiosk */}
      <form
        action={regAction}
        className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <Plus className="size-4" /> Registrasi kiosk baru
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted">Nama perangkat</span>
            <input
              name="nama_perangkat"
              required
              placeholder="mis. Kiosk Lobi 1"
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Unit kerja (opsional)</span>
            <select
              name="unit_kerja_id"
              defaultValue=""
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            >
              <option value="">—</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Latitude</span>
              <input
                name="latitude"
                required
                inputMode="decimal"
                placeholder="-3.24100"
                className="tabular w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Longitude</span>
              <input
                name="longitude"
                required
                inputMode="decimal"
                placeholder="116.28100"
                className="tabular w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            </label>
          </div>
        </div>
        {regState.message && !regState.ok && (
          <p className="text-sm font-medium text-danger">{regState.message}</p>
        )}
        <button
          disabled={regPending}
          className="pressable flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg disabled:opacity-60"
        >
          <Plus className="size-4" /> Daftarkan kiosk
        </button>
      </form>
    </div>
  );
}

function SecretBanner({ nama, secret }: { nama?: string; secret: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3 rounded-2xl border-2 border-warning/50 bg-warning-soft p-4">
      <div className="text-sm font-bold text-warning">
        Device secret untuk “{nama}” — salin sekarang, tidak akan ditampilkan lagi.
      </div>
      <div className="flex items-center gap-2">
        <code className="tabular flex-1 overflow-x-auto rounded-lg bg-surface px-3 py-2 text-xs no-scrollbar">
          {secret}
        </code>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="pressable grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-brand-fg"
          aria-label="Salin secret"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p className="text-xs text-warning/80">
        Buka <code>/kiosk/tampilan</code> di perangkat kiosk lalu tempel secret ini saat diminta.
      </p>
    </div>
  );
}
