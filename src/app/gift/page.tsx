import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, signFileAccess } from "@/lib/token";
import { getGiftConfig } from "@/lib/gift";
import { getSubscriber, recordGiftAccess } from "@/lib/db";

const COOKIE_NAME = "gift_session";

export default async function GiftPage() {
  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(COOKIE_NAME)?.value);

  // No valid session → they never submitted an email. Send them to get one.
  if (!session || !getSubscriber(session.email)) {
    redirect("/");
  }

  recordGiftAccess(session.email);
  const gift = getGiftConfig();

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 py-12">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-3xl">
          🎉
        </div>
        <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">
          وصلت! هذي هديتك
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-600">
          تقدر تشوفها هنا في الصفحة، أو تحمّلها لجهازك.
        </p>

        <div className="mt-8">
          {gift.mode === "external" ? (
            <a
              href={gift.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600"
            >
              افتح الهدية
            </a>
          ) : (
            <GiftFileViewer email={session.email} fileName={gift.fileName} />
          )}
        </div>
      </div>
    </main>
  );
}

function GiftFileViewer({ email, fileName }: { email: string; fileName: string }) {
  const { exp, sig } = signFileAccess(email);
  const viewUrl = `/api/gift-file?exp=${exp}&sig=${encodeURIComponent(sig)}`;
  const downloadUrl = `${viewUrl}&dl=1`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <iframe
          src={viewUrl}
          title={fileName}
          className="h-[70vh] w-full"
        />
      </div>

      <a
        href={downloadUrl}
        className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600 active:scale-[0.99]"
      >
        تحميل الهدية
      </a>

      <p className="text-xs text-slate-400">
        ما تظهر الهدية بشكل صحيح على جوالك؟ اضغط زر التحميل مباشرة.
      </p>
    </div>
  );
}
