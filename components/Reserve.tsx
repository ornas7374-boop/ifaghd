"use client";

import { useState } from "react";

import { MODELS } from "@/lib/content";
import { Reveal } from "@/components/Reveal";

const FIELD =
  "w-full border-0 border-b border-paper/15 bg-transparent px-0 py-4 font-sans " +
  "text-[0.95rem] font-light text-paper placeholder:text-paper/25 " +
  "transition-colors duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "focus:border-accent focus:outline-none";

export function Reserve() {
  // No appointment endpoint is wired up yet; the form validates and
  // acknowledges locally. Point handleSubmit at the booking service to make it
  // live — nothing else here needs to change.
  const [sent, setSent] = useState(false);

  return (
    <section id="reserve" className="border-t border-paper/10 bg-ink">
      <div className="mx-auto max-w-[92rem] px-6 py-32 sm:px-10 md:py-48">
        <div className="grid gap-16 md:grid-cols-[0.9fr_1.1fr] md:gap-24">
          <Reveal>
            <p className="label mb-8">Reserve</p>
            <h2 className="display text-[3rem] leading-[1] text-paper sm:text-6xl md:text-[5.4rem]">
              Your Bugatti
              <span className="block">awaits.</span>
            </h2>
            <p className="copy mt-9 max-w-sm text-[0.95rem]">
              Begin a private conversation with our specialists.
            </p>
            <p className="copy mt-14 max-w-sm text-[0.82rem]">
              Appointments are held by invitation at Molsheim and at a small
              number of partner ateliers. A specialist will reply personally.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <form
              className="md:pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                setSent(true);
              }}
            >
              <fieldset disabled={sent} className="grid gap-10 sm:grid-cols-2">
                <legend className="sr-only">Request a private appointment</legend>

                <Field label="Name" htmlFor="name">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Your full name"
                    className={FIELD}
                  />
                </Field>

                <Field label="Email" htmlFor="email">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className={FIELD}
                  />
                </Field>

                <Field label="Phone" htmlFor="phone">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+33 …"
                    className={FIELD}
                  />
                </Field>

                <Field label="Preferred model" htmlFor="model">
                  <select
                    id="model"
                    name="model"
                    defaultValue=""
                    className={`${FIELD} appearance-none`}
                  >
                    <option value="" disabled>
                      Select a model
                    </option>
                    {MODELS.map((model) => (
                      <option key={model} value={model} className="bg-ink">
                        {model}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Preferred appointment date" htmlFor="date">
                  <input
                    id="date"
                    name="date"
                    type="date"
                    className={`${FIELD} [color-scheme:dark]`}
                  />
                </Field>

                <Field label="Message" htmlFor="message" className="sm:col-span-2">
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    placeholder="Anything we should know before we meet."
                    className={`${FIELD} resize-none`}
                  />
                </Field>
              </fieldset>

              <div className="mt-16 flex items-center justify-between gap-6">
                <button
                  type="submit"
                  disabled={sent}
                  className="group inline-flex items-center gap-4 text-[0.7rem] tracking-[0.28em] text-paper uppercase transition-colors duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-accent disabled:text-paper/35"
                >
                  Request a private appointment
                  <span className="block h-px w-10 bg-paper/40 transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-16 group-hover:bg-accent" />
                </button>
              </div>

              <p
                aria-live="polite"
                className="copy mt-8 min-h-6 text-[0.82rem] text-accent/80"
              >
                {sent
                  ? "Thank you. Your request has been noted — a specialist will be in touch."
                  : ""}
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label block">
        {label}
      </label>
      {children}
    </div>
  );
}
