import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/token";
import { getSubscriber, recordGiftAccess } from "@/lib/db";
import { courseConfig } from "@/config/course";

const COOKIE_NAME = "gift_session";

export default async function CoursePage() {
  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(COOKIE_NAME)?.value);

  // No valid session → they never submitted an email. Send them to get one.
  if (!session || !getSubscriber(session.email)) {
    redirect("/");
  }

  recordGiftAccess(session.email);

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-3xl">
            🎉
          </div>
          <p className="text-sm font-bold text-amber-600">{courseConfig.brandName}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
            {courseConfig.courseName}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-600">
            {courseConfig.courseDescription}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-center text-sm font-medium leading-relaxed text-amber-800">
          {courseConfig.welcomeMessage}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {courseConfig.lessons.map((lesson, index) => (
            <a
              key={lesson.url + index}
              href={lesson.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-amber-300 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-center gap-4 text-start">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-700">
                  {index + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900">{lesson.title}</p>
                  {lesson.description && (
                    <p className="mt-0.5 text-sm text-slate-500">{lesson.description}</p>
                  )}
                </div>
              </div>
              <span className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-amber-600">
                شاهد الدرس
              </span>
            </a>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          واجهتك مشكلة بفتح أحد الدروس؟ راسلنا وبنساعدك فورًا.
        </p>
      </div>
    </main>
  );
}
