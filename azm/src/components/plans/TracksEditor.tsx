"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/db";
import { newId } from "@/lib/id";
import type { Track } from "@/lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ConfirmButton } from "../ui/ConfirmButton";
import { TextInput } from "../ui/fields";
import { IconPlus, IconTrash } from "../ui/icons";

export function TracksEditor({ tracks }: { tracks: Track[] }) {
  const [name, setName] = useState("");

  const rename = (id: string, value: string) =>
    updateSettings({ tracks: tracks.map((t) => (t.id === id ? { ...t, name: value } : t)) });

  return (
    <Card title="المسارات">
      <ul className="space-y-2">
        {tracks.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <TextInput
              defaultValue={t.name}
              aria-label={`اسم المسار ${t.name}`}
              onBlur={(e) => e.target.value.trim() && e.target.value !== t.name && rename(t.id, e.target.value.trim())}
            />
            <ConfirmButton label={`احذف مسار ${t.name}`} onConfirm={() => updateSettings({ tracks: tracks.filter((x) => x.id !== t.id) })}>
              <IconTrash />
            </ConfirmButton>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          updateSettings({ tracks: [...tracks, { id: newId(), name: name.trim() }] });
          setName("");
        }}
      >
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مسار جديد" aria-label="مسار جديد" />
        <Button type="submit" variant="secondary" disabled={!name.trim()} aria-label="أضف المسار">
          <IconPlus />
        </Button>
      </form>
    </Card>
  );
}
