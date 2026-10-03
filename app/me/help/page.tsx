import Link from "next/link";
import { ChevronLeft, Mail, MessageCircleQuestion } from "lucide-react";

import { RootiePageShell } from "@/components/layout/rootie-page-shell";
import { requireUser } from "@/lib/auth";

export default async function MeHelpPage() {
  await requireUser("/me/help");

  return (
    <RootiePageShell
      eyebrow="Profil"
      title="Pomoc a podpora"
      description="Neviete si rady? Sme tu pre vás."
      headerClassName="border border-[#e9e2d1] bg-[#faf8f4] shadow-none"
      actions={
        <Link
          href="/me"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e9e2d1] bg-[#f2ede2] text-[#67635c] hover:bg-[#ece6d8] hover:text-[#232711]"
          aria-label="Späť na profil"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      }
    >
      <section className="rootie-surface space-y-4 rounded-[18px] border-[#e9e2d1] p-4 shadow-none">
        <div className="flex items-start gap-3">
          <MessageCircleQuestion className="mt-0.5 size-5 shrink-0 text-[#4f5826]" aria-hidden />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[#232711]">Potrebujete pomoc?</h2>
            <p className="text-sm text-[#67635c]">
              Napíšte nám a radi vám pomôžeme s účtom, inzerátmi alebo objednávkami.
            </p>
          </div>
        </div>

        <a
          href="mailto:support@rootie.sk"
          className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#e9e2d1] bg-[#faf8f4] px-3 text-sm font-medium text-[#232711] transition-colors hover:bg-[#f1ece1]"
        >
          <Mail className="size-4" aria-hidden />
          support@rootie.sk
        </a>
      </section>
    </RootiePageShell>
  );
}
