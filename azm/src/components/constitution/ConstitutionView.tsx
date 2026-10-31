"use client";

import { useState } from "react";
import { getConstitution, getPlans, saveConstitution } from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import type { Constitution, IfThenPlan } from "@/lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { TextArea, TextInput } from "../ui/fields";
import { IconPlus, IconX } from "../ui/icons";
import { PageHeader } from "../ui/PageHeader";

async function load() {
  const [constitution, plans] = await Promise.all([getConstitution(), getPlans()]);
  return { constitution, plans: plans.filter((p) => p.active) };
}

export function ConstitutionView() {
  const data = useStored(load);
  if (!data) return null;
  return <Editor initial={data.constitution} plans={data.plans} />;
}

function Editor({ initial, plans }: { initial: Constitution; plans: IfThenPlan[] }) {
  const [c, setC] = useState(initial);
  const [rule, setRule] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<Constitution>) => {
    setC((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  return (
    <>
      <div className="space-y-4 print:hidden">
        <PageHeader
          title="دستوري الشخصي"
          subtitle="صفحة وحدة ترجع لها لما تضيع."
          action={
            <Button variant="secondary" onClick={() => window.print()} className="min-h-11 px-4 text-base">
              طباعة
            </Button>
          }
        />

        <Card title="مبادئي">
          <TextArea value={c.principles} onChange={(e) => set({ principles: e.target.value })} aria-label="مبادئي" />
        </Card>

        <Card title="خططي الثابتة">
          {plans.length > 0 ? (
            <ul className="mb-3 space-y-2">
              {plans.map((p) => (
                <li key={p.id} className="rounded-2xl bg-surface-2 p-3 text-base">
                  <b className="text-accent">إذا</b> {p.trigger} <b className="text-accent">←</b> {p.action}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-muted">خطط إذا–فإن المفعّلة تظهر هنا تلقائيًا.</p>
          )}
          <TextArea value={c.fixedPlans} onChange={(e) => set({ fixedPlans: e.target.value })} placeholder="خطط ثانية أو ملاحظات" aria-label="خطط إضافية" />
        </Card>

        <Card title="النوم والاستيقاظ">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-sm text-muted">أنام الساعة</span>
              <TextInput type="time" dir="ltr" className="text-center" value={c.sleep} onChange={(e) => set({ sleep: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-sm text-muted">أصحى الساعة</span>
              <TextInput type="time" dir="ltr" className="text-center" value={c.wake} onChange={(e) => set({ wake: e.target.value })} />
            </label>
          </div>
        </Card>

        <Card title="قواعد بيئتي">
          <ul className="space-y-2">
            {c.envRules.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <TextInput value={r} onChange={(e) => set({ envRules: c.envRules.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`قاعدة ${i + 1}`} />
                <button type="button" aria-label={`احذف القاعدة ${i + 1}`} onClick={() => set({ envRules: c.envRules.filter((_, j) => j !== i) })} className="grid size-11 shrink-0 place-items-center text-muted">
                  <IconX className="size-5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <TextInput value={rule} onChange={(e) => setRule(e.target.value)} placeholder="قاعدة جديدة" aria-label="قاعدة جديدة" />
            <Button
              variant="secondary"
              disabled={!rule.trim()}
              aria-label="أضف القاعدة"
              onClick={() => {
                set({ envRules: [...c.envRules, rule.trim()] });
                setRule("");
              }}
            >
              <IconPlus />
            </Button>
          </div>
        </Card>

        <Card title="بروتوكول الطوارئ">
          <TextArea rows={7} value={c.emergency} onChange={(e) => set({ emergency: e.target.value })} aria-label="بروتوكول الطوارئ" />
        </Card>

        <Button
          block
          onClick={async () => {
            await saveConstitution(c);
            setSaved(true);
          }}
        >
          {saved ? "انحفظ ✓" : "احفظ الدستور"}
        </Button>
      </div>

      <PrintDoc c={c} plans={plans} />
    </>
  );
}

function PrintDoc({ c, plans }: { c: Constitution; plans: IfThenPlan[] }) {
  return (
    <article className="hidden text-black print:block">
      <h1 className="mb-1 text-3xl font-bold">دستوري الشخصي</h1>
      <p className="mb-6 text-sm">عَزم</p>
      <Section title="مبادئي">
        <p className="whitespace-pre-line">{c.principles}</p>
      </Section>
      <Section title="خططي الثابتة">
        <ul className="list-disc ps-6">
          {plans.map((p) => (
            <li key={p.id}>
              إذا {p.trigger} ← {p.action}
              {p.time && ` (${p.time})`}
            </li>
          ))}
        </ul>
        {c.fixedPlans && <p className="mt-2 whitespace-pre-line">{c.fixedPlans}</p>}
      </Section>
      <Section title="النوم والاستيقاظ">
        <p>
          أنام <span dir="ltr">{c.sleep}</span> · أصحى <span dir="ltr">{c.wake}</span>
        </p>
      </Section>
      <Section title="قواعد بيئتي">
        <ul className="list-disc ps-6">
          {c.envRules.filter(Boolean).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Section>
      <Section title="بروتوكول الطوارئ">
        <p className="whitespace-pre-line">{c.emergency}</p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 break-inside-avoid">
      <h2 className="mb-2 border-b border-black/30 pb-1 text-xl font-bold">{title}</h2>
      <div className="text-base leading-relaxed">{children}</div>
    </section>
  );
}
