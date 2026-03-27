import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { WantedCreateForm } from "@/components/wanted/wanted-create-form";
import { RootiePageShell } from "@/components/layout/rootie-page-shell";

export default async function WantedCreatePage() {
  const user = await requireUser("/wanted/create");
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("region")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-dvh bg-background px-4 py-6 pb-24">
      <div className="mx-auto max-w-md">
        <RootiePageShell
          eyebrow="Hľadám"
          title="Nová požiadavka"
          description="Napíšte, čo hľadáte. Ponuky prídu priamo do správ."
          className="pb-0"
        >
          <WantedCreateForm defaultRegion={profile?.region ?? ""} />
        </RootiePageShell>
      </div>
    </main>
  );
}
