import Link from "next/link";
import { Leaf } from "lucide-react";
import { AuthScreenLayout } from "@/components/auth/auth-screen-layout";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <AuthScreenLayout className="justify-center">
      <div className="flex flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Leaf className="text-primary size-10" aria-hidden />
            <span className="rootie-h1 text-3xl tracking-tight">Rootie</span>
          </div>
          <p className="text-muted-foreground rootie-body max-w-[260px]">
            Rastliny na dosah vo vašom kraji.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button asChild size="lg" className="min-h-[48px] w-full text-base">
            <Link href="/login">Prihlásiť sa</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="min-h-[48px] w-full text-base"
          >
            <Link href="/signup">Vytvoriť účet</Link>
          </Button>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground mt-2 block min-h-[44px] py-3 text-center text-sm font-medium underline-offset-2 hover:underline"
          >
            Pokračovať bez účtu
          </Link>
        </div>
      </div>
    </AuthScreenLayout>
  );
}
