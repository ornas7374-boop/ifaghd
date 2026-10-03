"use client";

import type { ComponentProps, FormEvent } from "react";

/** يحذف الحقول الفارغة قبل الإرسال حتى يبقى الرابط نظيفًا وقابلًا للمشاركة */
export function stripEmptyFields(e: FormEvent<HTMLFormElement>) {
  for (const el of Array.from(e.currentTarget.elements)) {
    if (
      (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) &&
      el.name &&
      el.value === "" &&
      !(el instanceof HTMLInputElement && el.type === "checkbox")
    ) {
      el.disabled = true;
      // يُعاد تفعيله إن بقيت الصفحة (رجوع من المتصفح)
      requestAnimationFrame(() => (el.disabled = false));
    }
  }
}

export function GetForm({ onSubmit, ...props }: Omit<ComponentProps<"form">, "method">) {
  return (
    <form
      method="get"
      onSubmit={(e) => {
        onSubmit?.(e);
        if (!e.defaultPrevented) stripEmptyFields(e);
      }}
      {...props}
    />
  );
}
