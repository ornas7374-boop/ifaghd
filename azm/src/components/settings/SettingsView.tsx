"use client";

import { useRef, useState } from "react";
import { exportAll, getSettings, importAll, updateSettings } from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { TextInput } from "../ui/fields";
import { PageHeader } from "../ui/PageHeader";
import { CalendarSettings } from "./CalendarSettings";

export function SettingsView() {
  const settings = useStored(getSettings);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  if (!settings) return null;

  const backup = async () => {
    const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `azm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const restore = async (file: File) => {
    try {
      await importAll(JSON.parse(await file.text()));
      setMsg("رجعت بياناتك ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ما قدرنا نقرأ الملف");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="الإعدادات" />

      <CalendarSettings />

      <Card title="البرنامج">
        <label className="block">
          <span className="mb-2 block text-base">تاريخ بداية برنامج الـ30 يوم</span>
          <TextInput type="date" dir="ltr" className="text-center" value={settings.startDate} onChange={(e) => e.target.value && updateSettings({ startDate: e.target.value })} />
        </label>
      </Card>

      <Card title="المظهر">
        <div className="flex items-center justify-between">
          <span className="text-lg">داكن / فاتح</span>
          <ThemeToggle />
        </div>
      </Card>

      <Card title="النسخ الاحتياطي">
        <p className="mb-3 text-base leading-relaxed text-muted">بياناتك محفوظة في هالجهاز بس. خذ نسخة كل فترة، أو قبل ما تمسح بيانات المتصفح.</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={backup}>
            تصدير
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            استيراد
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="ملف النسخة الاحتياطية"
          onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])}
        />
        {msg && <p role="status" className="mt-3 text-base">{msg}</p>}
      </Card>
    </div>
  );
}
