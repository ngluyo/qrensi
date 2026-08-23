import Link from "next/link";
import { ScanFace, ShieldCheck, MonitorSmartphone, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getPengaturan, getLogoUrl } from "@/lib/pengaturan";
import { butuhSetup } from "@/lib/setup";

export default async function Home() {
  // Instalasi baru (belum ada admin) → arahkan ke wizard setup.
  if (await butuhSetup()) redirect("/setup");

  const p = await getPengaturan();
  const logoUrl = await getLogoUrl(p.logoPath);

  const entri = [
    { href: "/beranda", label: "Pegawai", desc: "Absen & lihat riwayat kehadiran", icon: ScanFace, primary: true },
    { href: "/kiosk/tampilan", label: "Mode Kiosk", desc: "Tampilkan QR di layar kantor", icon: MonitorSmartphone },
    { href: "/admin", label: "Panel Admin", desc: "Kelola pegawai, jam kerja, laporan", icon: ShieldCheck },
  ];

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 grid size-16 place-items-center overflow-hidden rounded-[1.4rem] bg-brand text-brand-fg shadow-[var(--shadow-lg)]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`Logo ${p.namaOrganisasi}`} className="size-full object-contain p-2" />
            ) : (
              <QRGlyph />
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{p.namaAplikasi}</h1>
          <p className="mt-1.5 text-sm text-muted">{p.tagline}</p>
          <p className="mt-0.5 text-xs font-medium text-muted">{p.namaOrganisasi}</p>
        </div>

        <div className="space-y-3">
          {entri.map(({ href, label, desc, icon: Icon, primary }) => (
            <Link
              key={href}
              href={href}
              className={`pressable flex items-center gap-4 rounded-2xl p-4 shadow-[var(--shadow-sm)] ${
                primary ? "bg-brand text-brand-fg" : "border border-border bg-surface"
              }`}
            >
              <div className={`grid size-11 place-items-center rounded-xl ${primary ? "bg-white/15" : "bg-surface-2"}`}>
                <Icon className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold">{label}</div>
                <div className={`text-xs ${primary ? "text-brand-fg/70" : "text-muted"}`}>{desc}</div>
              </div>
              <ChevronRight className={`size-5 ${primary ? "opacity-70" : "text-muted"}`} />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function QRGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3M20 14v3M14 20h3M20 17v4" />
    </svg>
  );
}
