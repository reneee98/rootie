import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { WizardShell } from "@/components/create/wizard-shell";

export default async function CreatePage() {
  const user = await requireUser("/create");
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("region")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-dvh bg-background">
      <WizardShell
        userId={user.id}
        defaultRegion={profile?.region ?? ""}
      />
    </main>
  );
}
