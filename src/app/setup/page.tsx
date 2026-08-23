import { redirect } from "next/navigation";
import { butuhSetup } from "@/lib/setup";
import { SetupWizard } from "./setup-wizard";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Setelah admin pertama ada, halaman ini tertutup permanen.
  if (!(await butuhSetup())) redirect("/login");
  return <SetupWizard />;
}
