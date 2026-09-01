import EmailForm from "@/components/EmailForm";
import { courseConfig } from "@/config/course";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm text-center">
        <p className="mb-3 text-sm font-bold text-amber-600">{courseConfig.brandName}</p>

        {courseConfig.heroImageUrl ? (
          <div className="mx-auto mb-6 h-40 w-full overflow-hidden rounded-3xl bg-amber-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element -- external, unpredictable domains */}
            <img
              src={courseConfig.heroImageUrl}
              alt={courseConfig.courseName}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-3xl">
            🎁
          </div>
        )}

        <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
          {courseConfig.courseName}
        </h1>

        <p className="mx-auto mt-4 max-w-xs text-base leading-relaxed text-slate-600">
          {courseConfig.courseDescription}
        </p>

        <div className="mt-8 flex justify-center">
          <EmailForm />
        </div>
      </div>
    </main>
  );
}
