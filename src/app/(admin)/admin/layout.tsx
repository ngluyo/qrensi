import type { ReactNode } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  CalendarRange,
  MonitorSmartphone,
  Percent,
  ScrollText,
} from "lucide-react";

const menu = [
  { href: "/admin/pegawai", label: "Pegawai", icon: Users },
  { href: "/admin/pola-hari-kerja", label: "Pola Hari Kerja", icon: CalendarRange },
  { href: "/admin/jam-kerja", label: "Jam Kerja", icon: Clock },
  { href: "/admin/kiosk", label: "Kiosk", icon: MonitorSmartphone },
  { href: "/admin/potongan", label: "Potongan", icon: Percent },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:flex-row md:p-8">
      <aside className="md:w-56 md:shrink-0">
        <Link href="/admin" className="mb-4 block text-lg font-bold">
          QRensi Admin
        </Link>
        <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {menu.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <Icon className="size-4 text-slate-500" /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
