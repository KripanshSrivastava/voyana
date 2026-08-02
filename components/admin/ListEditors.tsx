"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { Input, Textarea, Button } from "@/components/ui";

export function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-700">{label}</label>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={it}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))}
            />
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="shrink-0 rounded-lg px-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => onChange([...items, ""])}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    </div>
  );
}

export type FaqItem = { question: string; answer: string };

export function FaqListEditor({ items, onChange }: { items: FaqItem[]; onChange: (items: FaqItem[]) => void }) {
  const update = (i: number, patch: Partial<FaqItem>) =>
    onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-700">FAQs</label>
      <div className="space-y-3">
        {items.map((f, i) => (
          <div key={i} className="rounded-xl border border-navy-100 p-3">
            <div className="flex gap-2">
              <Input value={f.question} placeholder="Question" onChange={(e) => update(i, { question: e.target.value })} />
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="shrink-0 rounded-lg px-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <Textarea rows={2} className="mt-2" value={f.answer} placeholder="Answer" onChange={(e) => update(i, { answer: e.target.value })} />
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => onChange([...items, { question: "", answer: "" }])}>
        <Plus className="h-4 w-4" /> Add FAQ
      </Button>
    </div>
  );
}

export type ItineraryItem = { day: number; title: string; description: string };

export function ItineraryEditor({ items, onChange }: { items: ItineraryItem[]; onChange: (items: ItineraryItem[]) => void }) {
  const update = (i: number, patch: Partial<ItineraryItem>) =>
    onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-700">Itinerary</label>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2 rounded-xl border border-navy-100 p-3">
            <div className="flex flex-col items-center pt-2 text-navy-300"><GripVertical className="h-4 w-4" /></div>
            <div className="flex-1">
              <div className="flex gap-2">
                <Input type="number" className="w-20" value={it.day} onChange={(e) => update(i, { day: Number(e.target.value) })} />
                <Input value={it.title} placeholder={`Day ${it.day} title`} onChange={(e) => update(i, { title: e.target.value })} />
                <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="shrink-0 rounded-lg px-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Textarea rows={2} className="mt-2" value={it.description} placeholder="What happens on this day" onChange={(e) => update(i, { description: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => onChange([...items, { day: items.length + 1, title: "", description: "" }])}>
        <Plus className="h-4 w-4" /> Add day
      </Button>
    </div>
  );
}
