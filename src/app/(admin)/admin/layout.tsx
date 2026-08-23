import type { ReactNode } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  CalendarRange,
  MonitorSmartphone,
  Percent,
  ScrollText,
  ScanFace,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { can, type Kemampuan } from "@/lib/izin";

// `perlu` = kemampuan minimum untuk melihat menu (undefined = semua admin).
const menu: { href: string; label: string; icon: typeof Users; perlu?: Kemampuan }[] = [
  { href: "/admin/pegawai", label: "Pegawai", icon: Users },
  { href: "/admin/enrollment", label: "Enrollment", icon: ScanFace },
  { href: "/admin/sanggahan", label: "Izin & Sanggahan", icon: FileText },
  { href: "/admin/kiosk", label: "Kiosk", icon: MonitorSmartphone },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/pola-hari-kerja", label: "Pola Hari Kerja", icon: CalendarRange, perlu: "konfig.jam_kerja" },
  { href: "/admin/jam-kerja", label: "Jam Kerja", icon: Clock, perlu: "konfig.jam_kerja" },
  { href: "/admin/potongan", label: "Potongan", icon: Percent, perlu: "konfig.potongan" },
  { href: "/admin/laporan", label: "Laporan", icon: FileSpreadsheet, perlu: "laporan.ekspor" },
  { href: "/admin/pengguna", label: "Pengguna & Peran", icon: ShieldCheck, perlu: "peran.kelola" },
  { href: "/admin/pengaturan", label: "Pengaturan Aplikasi", icon: Settings, perlu: "konfig.instansi" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:flex-row md:p-8">
      <aside className="md:w-56 md:shrink-0">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/admin" className="text-lg font-extrabold tracking-tight">
            QRensi Admin
          </Link>
        </div>
        <Link
          href="/admin/akun"
          className="pressable mb-4 flex items-center gap-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-sm)]"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
            {(user.nama ?? user.email ?? "A").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.nama ?? user.email}</div>
            <div className="text-xs capitalize text-muted">
              {user.peran === "super_admin" ? "Super Admin" : "Admin Unit"}
            </div>
          </div>
        </Link>
        <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {menu
            .filter((m) => !m.perlu || can(user, m.perlu))
            .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium transition hover:shadow-[var(--shadow-sm)]"
            >
              <Icon className="size-4 text-muted" /> {label}
            </Link>
          ))}
          <form action="/logout" method="post" className="md:mt-2">
            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-danger">
              <LogOut className="size-4" /> Keluar
            </button>
          </form>
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
