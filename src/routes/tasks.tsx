import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckSquare, Plus, Trash2, Square } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/tasks")({
  component: () => <RequireAuth title="قسم المهام للطلاب المسجّلين"><TasksPage /></RequireAuth>,
  head: () => ({ meta: [{ title: "قسم المهام — المنارة" }, { name: "description", content: "قائمة مهام يومية للطالب." }] }),
});

type Task = { id: string; text: string; done: boolean; createdAt: number };
const KEY = "manara.tasks.v1";

function read(): Task[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState("");
  useEffect(() => { setTasks(read()); }, []);
  const save = (next: Task[]) => { setTasks(next); localStorage.setItem(KEY, JSON.stringify(next)); };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    save([{ id: crypto.randomUUID(), text: t, done: false, createdAt: Date.now() }, ...tasks]);
    setText("");
  };
  const toggle = (id: string) => save(tasks.map((x) => x.id === id ? { ...x, done: !x.done } : x));
  const remove = (id: string) => save(tasks.filter((x) => x.id !== id));
  const clearDone = () => save(tasks.filter((x) => !x.done));

  const remaining = tasks.filter((x) => !x.done).length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-royal shadow-luxury"><CheckSquare className="h-6 w-6 text-gold" /></div>
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">قسم المهام</h1>
          <p className="text-sm text-muted-foreground">نظّم مهامك اليومية ولا تنسَ أي درس.</p>
        </div>
      </header>

      <form onSubmit={add} className="mb-5 flex gap-2 rounded-2xl border border-gold/30 bg-card p-3 shadow-card">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="أضف مهمة جديدة…" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button className="inline-flex items-center gap-1 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}><Plus className="h-4 w-4" /> إضافة</button>
      </form>

      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>المتبقّي: {remaining} / {tasks.length}</span>
        {tasks.some((x) => x.done) && <button onClick={clearDone} className="text-destructive hover:underline">حذف المنجزة</button>}
      </div>

      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card transition-smooth hover:border-gold/40">
            <button onClick={() => toggle(t.id)} className="text-gold">
              {t.done ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
            </button>
            <span className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : "font-semibold"}`}>{t.text}</span>
            <button onClick={() => remove(t.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {tasks.length === 0 && <li className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا توجد مهام بعد — أضف أول مهمة بالأعلى.</li>}
      </ul>
    </div>
  );
}
