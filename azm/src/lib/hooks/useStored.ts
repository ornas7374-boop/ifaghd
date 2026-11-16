"use client";

import { useEffect, useState } from "react";
import { subscribe } from "../db";

/**
 * يقرأ بيانات من المستودع ويحدّثها تلقائيًا لما تتغير.
 * مرّر دالة ثابتة (من مستوى الملف أو useCallback).
 */
export function useStored<T>(load: () => Promise<T>): T | undefined {
  const [data, setData] = useState<T>();

  useEffect(() => {
    let alive = true;
    const run = () =>
      load().then((value) => {
        if (alive) setData(value);
      });
    run();
    const unsubscribe = subscribe(run);
    // التطبيق ممكن يبقى مفتوح لليوم الثاني — نحدّث لما يرجع للواجهة.
    const onVisible = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return data;
}
