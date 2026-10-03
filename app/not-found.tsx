import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RootiePageShell } from "@/components/layout/rootie-page-shell";

export default function NotFound() {
  return (
    <RootiePageShell
      title="Stránka sa nenašla"
      description="Tento odkaz už nie je dostupný alebo je nesprávny."
    >
      <Button asChild>
        <Link href="/">Späť na domov</Link>
      </Button>
    </RootiePageShell>
  );
}
