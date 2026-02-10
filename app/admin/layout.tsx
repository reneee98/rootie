import { requireModerator } from "@/lib/auth";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModerator("/me");
  return <AdminShell>{children}</AdminShell>;
}
