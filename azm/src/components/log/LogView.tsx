"use client";

import Link from "next/link";
import { feelingById } from "@/lib/content/feelings";
import { deleteProcrastination, getProcrastinationLog, getSettings } from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import { Card } from "../ui/Card";
import { ConfirmButton } from "../ui/ConfirmButton";
import { PageHeader } from "../ui/PageHeader";
import { IconChart, IconTrash } from "../ui/icons";
import { QuickLog } from "./QuickLog";

async function load() {
  const [settings, log] = await Promise.all([getSettings(), getProcrastinationLog()]);
  return { tracks: settings.tracks, log };
}

const timeFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { weekday: "short", hour: "numeric", minute: "2-digit" });

export function LogView() {
  const data = useStored(load);
  if (!data) return null;
  const { tracks, log } = data;
  const recentTasks = [...new Set(log.slice().reverse().map((e) => e.task))].slice(0, 3);

  return (
    <div className="space-y-4">
      <PageHeader
        title="سجل التسويف"
        subtitle="مو محاكمة. بيانات تكشف لك النمط."
        action={
          <Link href="/insights" className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-accent">
            <IconChart className="size-5" /> التحليل
          </Link>
        }
      />

      <QuickLog tracks={tracks} recentTasks={recentTasks} />

      {log.length > 0 && (
        <Card title={`آخر الإدخالات (${log.length})`}>
          <ul className="divide-y divide-line">
            {log
              .slice(-10)
              .reverse()
              .map((e) => {
                const f = feelingById(e.feeling);
                return (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <span className="text-2xl" aria-hidden>
                      {f.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium">{e.task}</p>
                      <p className="truncate text-sm text-muted">
                        {f.label}
                        {e.instead && ` · ${e.instead}`} · {timeFmt.format(new Date(e.at))}
                      </p>
                    </div>
                    <ConfirmButton label="احذف الإدخال" onConfirm={() => deleteProcrastination(e.id)}>
                      <IconTrash />
                    </ConfirmButton>
                  </li>
                );
              })}
          </ul>
        </Card>
      )}
    </div>
  );
}
