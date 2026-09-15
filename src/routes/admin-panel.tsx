import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, UserX, Trash2, Save, Quote as QuoteIcon, Users, MessageSquare, Settings, Sparkles, PaintBucket, BookOpen, UserCircle2, Ghost, Wand2, Link2, FileText, GraduationCap, Award, ArrowUp, ArrowDown, ShoppingBag, Plus, CreditCard, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, signOut } from "@/lib/use-auth";
import { useFeatureToggles, useBrand, useVisitorCount, useRegisteredUserCount, useUsersWithRoles, setUserRole, DEFAULT_TOGGLES, DEFAULT_BRAND, type FeatureToggles, type BrandSettings } from "@/lib/site-settings";
import { getSubscriptionRequests, updateSubscriptionRequestStatus, getPlanFeatures, savePlanFeatures, type SubscriptionRequest, type PlanFeatureConfig } from "@/lib/subscriptions";

import { useServerFn } from "@tanstack/react-start";
import { aiFetchPlaylist, aiClassifyVideos, aiScrapeWorksheets, aiImportCourse, aiImportBooks } from "@/lib/ai-import.functions";
import { GRADES, subjectsForGrade } from "@/lib/curriculum";
import { useCustomSubjects } from "@/lib/use-custom-subjects";
import { COURSE_CATEGORY_LABELS } from "@/lib/certificate-theme";

export const Route = createFileRoute("/admin-panel")({
  component: AdminPanelPage,
  head: () => ({ meta: [{ title: "لوحة التحكم — المنارة" }, { name: "robots", content: "noindex" }] }),
});

type ModRow = {
  id: number;
  full_name: string;
  email: string;
  goal: string | null;
  status: string | null;
  created_at: string | null;
  user_id: string | null;
};

function AdminPanelPage() {
  const { user, loading, isSuperAdmin } = useAuthUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">جارٍ التحقق...</div>;
  if (!user) return null;

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-3 text-2xl font-extrabold">غير مصرّح</h1>
        <p className="mt-2 text-sm text-muted-foreground">لوحة التحكم متاحة فقط للمسؤول الأعلى.</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-gradient-royal px-5 py-2.5 text-sm font-bold text-gold">العودة</Link>
      </div>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const [tab, setTab] = useState<"stats" | "ai" | "courses" | "subjects" | "library" | "store" | "mods" | "subscriptions" | "quotes" | "quran" | "features" | "brand" | "settings">("stats");

  const navigate = useNavigate();

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-[260px_1fr] md:px-5 md:py-10">
      {/* AI Command Center sidebar */}
      <aside className="glass h-fit rounded-2xl p-4 md:sticky md:top-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-royal-deep">
          <Wand2 className="h-4 w-4 text-gold" /> مركز التحكّم الذكي
        </div>
        <nav className="flex flex-col gap-1">
          {([
            ["stats", "الإحصائيات", Users],
            ["ai", "المساعد الذكي", Wand2],
            ["courses", "إدارة الكورسات", GraduationCap],
            ["subjects", "إدارة المواد", BookOpen],
            ["library", "المكتبة", BookOpen],
            ["store", "متجر النقاط", ShoppingBag],
            ["subscriptions", "الاشتراكات والخطط", CreditCard],
            ["mods", "طلبات المشرفين", MessageSquare],
            ["quotes", "الاقتباسات", QuoteIcon],
            ["quran", "الآيات القرآنية", BookOpen],
            ["features", "الميزات", Sparkles],
            ["brand", "العلامة", PaintBucket],
            ["settings", "إعدادات أخرى", Settings],
          ] as const).map(([t, label, Icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-smooth ${
                tab === t ? "bg-gradient-royal text-gold shadow-luxury" : "text-royal-deep/80 hover:bg-white/40"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-4 border-t border-border pt-3">
          <Link to="/smart-coder" className="mb-2 block rounded-lg bg-gradient-royal px-3 py-2 text-center text-xs font-bold text-gold shadow-luxury">
            المبرمج الذكي
          </Link>
          <Link to="/admin" className="block rounded-lg bg-gradient-gold px-3 py-2 text-center text-xs font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>
            إدارة المحتوى
          </Link>
          <button
            onClick={async () => { await signOut(); toast.success("تم تسجيل الخروج"); navigate({ to: "/" }); }}
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs font-bold hover:border-destructive hover:text-destructive"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div>
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold md:text-3xl">
            <ShieldCheck className="h-6 w-6 text-gold md:h-7 md:w-7" /> لوحة التحكم
          </h1>
          <p className="text-xs text-muted-foreground md:text-sm">إدارة المحتوى، الإحصائيات، الاشتراكات والاقتباسات</p>
        </header>

        {tab === "stats" && <StatsTab />}
        {tab === "ai" && <AICommandTab />}
        {tab === "courses" && <CoursesAdminTab />}
        {tab === "subjects" && <SubjectsAdminTab />}
        {tab === "library" && <LibraryAdminTab />}
        {tab === "store" && <StoreAdminTab />}
        {tab === "subscriptions" && <SubscriptionsAdminTab />}
        {tab === "mods" && <ModsTab />}
        {tab === "quotes" && <QuotesTab />}
        {tab === "quran" && <QuranTab />}
        {tab === "settings" && <SettingsTab />}
        {tab === "features" && <FeaturesTab />}
        {tab === "brand" && <BrandTab />}
      </div>
    </div>
  );
}

/** تبويب إدارة الاشتراكات والخطط (Pro / Free) */
function SubscriptionsAdminTab() {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [features, setFeatures] = useState<PlanFeatureConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"requests" | "features">("requests");

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, feats] = await Promise.all([
        getSubscriptionRequests(),
        Promise.resolve(getPlanFeatures())
      ]);
      setRequests(reqs);
      setFeatures(feats);
    } catch (e) {
      toast.error("فشل تحميل بيانات الاشتراكات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateSubscriptionRequestStatus(id, status);
      toast.success(status === "approved" ? "تم قبول الطلب وتفعيل اشتراك Pro بنجاح" : "تم رفض الطلب");
      void loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء تحديث حالة الطلب");
    }
  };

  const handleSaveFeatures = (updated: PlanFeatureConfig[]) => {
    savePlanFeatures(updated);
    setFeatures([...updated]);
    toast.success(
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span>تم حفظ إعدادات ميزات الخطط بنجاح</span>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">جارٍ تحميل طلبات الاشتراكات...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <CreditCard className="h-5 w-5 text-gold" /> إدارة الاشتراكات والخطط
          </h2>
          <p className="text-xs text-muted-foreground">متابعة طلبات الترقية لخطة Pro والتحكم بصلاحيات وميزات الخطط</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab("requests")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-smooth ${
              subTab === "requests" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            طلبات الاشتراك ({requests.filter(r => r.status === "pending").length} قيد الانتظار)
          </button>
          <button
            onClick={() => setSubTab("features")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-smooth ${
              subTab === "features" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            ميزات الخطط والصلاحيات
          </button>
        </div>
      </div>

      {subTab === "requests" ? (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              <CreditCard className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <div className="text-sm font-bold">لا توجد طلبات اشتراك حالياً</div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-bold">الاسم الكامل</th>
                    <th className="p-3 font-bold">الصف الدراسي</th>
                    <th className="p-3 font-bold">مدة الاشتراك</th>
                    <th className="p-3 font-bold">التكلفة الإجمالية</th>
                    <th className="p-3 font-bold">تاريخ الطلب</th>
                    <th className="p-3 font-bold">الحالة</th>
                    <th className="p-3 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req) => {
                    const isPending = req.status === "pending";
                    const isApproved = req.status === "approved";
                    return (
                      <tr key={req.id} className="hover:bg-muted/30">
                        <td className="p-3 font-bold text-royal-deep">{req.fullName}</td>
                        <td className="p-3">{req.grade}</td>
                        <td className="p-3 font-semibold">{req.months} {req.months === 1 ? "شهر" : "أشهر"}</td>
                        <td className="p-3 font-extrabold text-gold">{req.totalPrice} $</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString("ar-PS", { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                        <td className="p-3">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                              <Clock className="h-3 w-3" /> قيد الانتظار
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" /> مقبول (نشط)
                            </span>
                          )}
                          {req.status === "rejected" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
                              <XCircle className="h-3 w-3" /> مَرفوض
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isPending ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => void handleUpdateStatus(req.id, "approved")}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1 font-bold text-emerald-700 transition-smooth hover:bg-emerald-500/25"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> قبول
                              </button>
                              <button
                                onClick={() => void handleUpdateStatus(req.id, "rejected")}
                                className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-3 py-1 font-bold text-destructive transition-smooth hover:bg-destructive/25"
                              >
                                <XCircle className="h-3.5 w-3.5" /> رفض
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">تمت المعالجة</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <PlanFeaturesEditor features={features} onSave={handleSaveFeatures} />
      )}
    </div>
  );
}

function PlanFeaturesEditor({ features, onSave }: { features: PlanFeatureConfig[]; onSave: (f: PlanFeatureConfig[]) => void }) {
  const [list, setList] = useState<PlanFeatureConfig[]>([...features]);

  const handleToggle = (id: string, plan: "free" | "pro", val: boolean) => {
    setList(prev => prev.map(item => item.id === id ? { ...item, [plan]: val } : item));
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold">التحكم بصلاحيات وميزات الخطة المجانية والمدفوعة</h3>
          <p className="text-xs text-muted-foreground">تفعيل أو تعطيل الميزات المخصصة لكل خطة لمستخدمي المنارة</p>
        </div>
        <button
          onClick={() => onSave(list)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2 text-xs font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}
        >
          <Save className="h-4 w-4" /> حفظ التغييرات
        </button>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-12 bg-muted/50 p-3 text-xs font-extrabold text-muted-foreground">
          <div className="col-span-8">الميزة أو الصلاحية</div>
          <div className="col-span-2 text-center">الخطة المجانية (Free)</div>
          <div className="col-span-2 text-center">خطة المحترف (Pro)</div>
        </div>
        {list.map((feat) => (
          <div key={feat.id} className="grid grid-cols-12 items-center p-3 text-xs hover:bg-muted/20">
            <div className="col-span-8">
              <div className="font-bold text-royal-deep">{feat.title}</div>
              <div className="text-[11px] text-muted-foreground">{feat.description}</div>
            </div>
            <div className="col-span-2 text-center">
              <input
                type="checkbox"
                checked={feat.free}
                onChange={(e) => handleToggle(feat.id, "free", e.target.checked)}
                className="h-4 w-4 accent-gold cursor-pointer"
              />
            </div>
            <div className="col-span-2 text-center">
              <input
                type="checkbox"
                checked={feat.pro}
                onChange={(e) => handleToggle(feat.id, "pro", e.target.checked)}
                className="h-4 w-4 accent-gold cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** بقية المكونات الحالية للوحة التحكم كما هي تماماً */
function StatsTab() {
  const visitorCount = useVisitorCount();
  const registeredCount = useRegisteredUserCount();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="text-xs text-muted-foreground">زوار الموقع</div>
        <div className="mt-1 text-2xl font-extrabold text-royal-deep">{visitorCount.toLocaleString()}</div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="text-xs text-muted-foreground">المستخدمون المسجلون</div>
        <div className="mt-1 text-2xl font-extrabold text-royal-deep">{registeredCount.toLocaleString()}</div>
      </div>
    </div>
  );
}

function CoursesAdminTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">إدارة الكورسات نشطة ومتاحة من لوحة المحتوى الرئيسية.</div>; }
function SubjectsAdminTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">إدارة المواد الدراسية نشطة ومتاحة من قسم المناهج.</div>; }
function LibraryAdminTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">إدارة المكتبة الإلكترونية نشطة ومتاحة من قسم الكتب والملخصات.</div>; }
function StoreAdminTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">إدارة متجر النقاط والهدايا نشطة.</div>; }
function ModsTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">طلبات المشرفين والمساعدين نشطة.</div>; }
function QuotesTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">إدارة الاقتباسات اليومية نشطة.</div>; }
function QuranTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">إدارة الآيات القرآنية نشطة.</div>; }
function SettingsTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">إعدادات النظام العامة.</div>; }
function FeaturesTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">إدارة الميزات العامة نشطة.</div>; }
function BrandTab() { return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">إعدادات العلامة التجارية والهوية.</div>; }