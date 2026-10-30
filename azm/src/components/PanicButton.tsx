import Link from "next/link";
import { IconLifebuoy } from "./ui/icons";

export function PanicButton() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link
        href="/stuck"
        className="pointer-events-auto mx-auto flex min-h-16 max-w-lg items-center justify-center gap-3 rounded-2xl bg-sos text-xl font-bold text-sos-fg shadow-lg shadow-sos/20 transition active:scale-[0.98]"
      >
        <IconLifebuoy />
        أنا عالق الحين
      </Link>
    </div>
  );
}
