import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/use-auth";
import { toast } from "sonner";
import { Coins, ShoppingBag, Check, Sparkles, BookOpen, Palette, Award } from "lucide-react";

export const Route = createFileRoute("/store")({
  component: StorePage,
  head: () => ({
    meta: [
      { title: "متجر كنز المنارة — أنفق نقاطك" },
      { name: "description", content: "اشترِ خلفيات وأفاتار وكتبًا حصرية باستخدام نقاطك المكتسبة من الدراسة والألعاب." },
    ],
  }),
});

type Item = {
  id: string;
  title: string;
  description: string | null;
  kind: "avatar" | "wallpaper" | "book" | "badge";
  image_url: string | null;
  payload_url: string | null;
  price: number;
};

const KIND_ICON: Record<Item["kind"], typeof Palette> = {
  avatar: Sparkles,
  wallpaper: Palette,
  book: BookOpen,
  badge: Award,
};

const KIND_LABEL: Record<Item["kind"], string> = {
  avatar: "أفاتار",
  wallpaper: "خلفية",
  book: "كتاب حصري",
  badge: "شارة",
};

function StorePage() {
  const { user } = useAuthUser();
  const [items, setItems] = useState<Item[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Item["kind"] | "all">("all");

  const refresh = async () => {
    setLoading(true);
    const [{ data: rows }, ownedRes, balRes] = await Promise.all([
      supabase.from("store_items" as never).select("*").eq("active", true).order("price", { ascending: true }),
      user ? supabase.from("purchases" as never).select("item_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      user ? (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>)("get_user_points", { _user_id: user.id }) : Promise.resolve({ data: 0 }),
    ]);
    setItems((rows as never as Item[]) || []);
    setOwned(new Set(((ownedRes.data as { item_id: string }[] | null) || []).map((r) => r.item_id)));
    setBalance(Number(balRes.data) || 0);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const buy = async (it: Item) => {
    if (!user) { toast.error("سجّل دخولك أولًا"); return; }
    if (owned.has(it.id)) { toast.info("تملك هذا العنصر"); return; }
    if (balance < it.price) { toast.error(`تحتاج ${it.price - balance} نقطة إضافية`); return; }
    const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)("redeem_store_item", { _item_id: it.id });
    if (error) { toast.error(error.message); return; }
    toast.success("تم الشراء! 🎉");
    const newBal = (data as { balance?: number } | null)?.balance;
    if (typeof newBal === "number") setBalance(newBal);
    setOwned((s) => new Set(s).add(it.id));
  };

  const shown = items.filter((i) => tab === "all" || i.kind === tab);

  return (
    <div className="page-shell py-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold md:text-4xl">
            <ShoppingBag className="h-8 w-8 text-gold" /> متجر كنز المنارة
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            اكسب النقاط من الجلسات والألعاب ومشاهدة الفيديوهات — ثم أنفقها هنا على مكافآت رقمية.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-royal px-5 py-3 text-gold shadow-luxury">
          <Coins className="h-5 w-5" />
          <span className="text-xs font-bold">رصيدك</span>
          <span className="text-2xl font-black tabular-nums">{balance}</span>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "avatar", "wallpaper", "book", "badge"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${tab === k ? "border-gold bg-gold text-royal-deep shadow-gold" : "border-border hover:border-gold/60"}`}
          >
            {k === "all" ? "الكل" : KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          لا توجد عناصر متاحة بعد.{" "}
          <Link to="/admin-panel" className="text-primary underline">أضف من لوحة الإدارة</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((it) => {
            const Icon = KIND_ICON[it.kind];
            const isOwned = owned.has(it.id);
            return (
              <article key={it.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.title} className="h-40 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-40 w-full place-items-center bg-gradient-royal text-gold">
                    <Icon className="h-16 w-16" />
                  </div>
                )}
                <div className="p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{KIND_LABEL[it.kind]}</div>
                  <h3 className="mt-1 text-base font-extrabold">{it.title}</h3>
                  {it.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{it.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-extrabold text-gold">
                      <Coins className="h-3.5 w-3.5" /> {it.price}
                    </div>
                    {isOwned ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <Check className="h-3.5 w-3.5" /> مُمتلك
                      </span>
                    ) : (
                      <button
                        onClick={() => buy(it)}
                        className="rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-extrabold shadow-gold hover:scale-105"
                        style={{ color: "var(--royal-deep)" }}
                      >
                        شراء
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
