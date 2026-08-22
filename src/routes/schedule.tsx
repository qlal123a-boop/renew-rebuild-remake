import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/schedule")({
  component: () => <RequireAuth title="الجدول المدرسي للطلاب المسجّلين"><SchedulePage /></RequireAuth>,
  head: () => ({ meta: [{ title: "الجدول المدرسي — المنارة" }, { name: "description", content: "جدول حصص أسبوعي قابل للتعديل." }] }),
});

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"] as const;
const PERIODS = [1, 2, 3, 4, 5, 6, 7] as const;
const KEY = "manara.schedule.v1";

type Grid = Record<string, string>; // key = `${day}-${period}`

function emptyGrid(): Grid { return {}; }

function SchedulePage() {
  const [grid, setGrid] = useState<Grid>({});
  useEffect(() => {
    try { setGrid(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { setGrid({}); }
  }, []);

  const setCell = (day: string, period: number, value: string) => {
    setGrid((g) => ({ ...g, [`${day}-${period}`]: value }));
  };

  const save = () => { localStorage.setItem(KEY, JSON.stringify(grid)); toast.success("تم حفظ الجدول"); };
  const reset = () => { if (confirm("مسح الجدول كاملاً؟")) { setGrid(emptyGrid()); localStorage.removeItem(KEY); toast.success("تم المسح"); } };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-royal shadow-luxury"><CalendarDays className="h-6 w-6 text-gold" /></div>
          <div>
            <h1 className="text-2xl font-extrabold md:text-3xl">الجدول المدرسي</h1>
            <p className="text-sm text-muted-foreground">جدول الحصص الأسبوعي — اضغط على أي خلية وأدخل اسم المادة.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}><Save className="h-4 w-4" /> حفظ</button>
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:border-destructive hover:text-destructive"><RotateCcw className="h-4 w-4" /> مسح</button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-gold/30 bg-card p-2 shadow-card">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-20 rounded-tl-xl bg-gradient-royal p-2 text-gold">الحصة</th>
              {DAYS.map((d) => <th key={d} className="bg-gradient-royal p-2 text-gold">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p}>
                <td className="border border-border bg-secondary p-2 text-center font-bold text-royal-deep" style={{ color: "var(--royal-deep)" }}>{p}</td>
                {DAYS.map((d) => {
                  const k = `${d}-${p}`;
                  return (
                    <td key={k} className="border border-border p-1">
                      <input
                        value={grid[k] || ""}
                        onChange={(e) => setCell(d, p, e.target.value)}
                        placeholder="—"
                        className="w-full rounded-md bg-background px-2 py-2 text-center text-xs outline-none transition-smooth focus:bg-gold/10 focus:ring-2 focus:ring-gold/40"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">يُحفظ الجدول محليًا في متصفّحك ولا يُشارك مع أحد.</p>
    </div>
  );
}
