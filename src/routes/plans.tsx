import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, Crown, Zap, MessageCircle, ShieldCheck, CheckCircle2, Star, Calculator, ArrowRight, User, GraduationCap, Calendar, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/lib/use-auth";
import { GRADES } from "@/lib/curriculum";
import {
  submitSubscriptionRequest,
  FREE_FEATURES,
  PRO_FEATURES,
  PRICE_PER_MONTH_USD,
  PRICE_PER_MONTH_NIS,
  formatWhatsAppMessage,
  WHATSAPP_NUMBER
} from "@/lib/subscriptions";

export const Route = createFileRoute("/plans")({
  component: PlansPage,
  head: () => ({
    meta: [
      { title: "الخطط والاشتراكات — المنارة المتجددة" },
      { name: "description", content: "اختر خطة الاشتراك المناسبة لك للاستفادة الكاملة من جميع الميزات التعليمية الحصرية والذكاء الاصطناعي في منصة المنارة المتجددة." },
    ],
  }),
});

function PlansPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  // Form state for Pro plan registration
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [grade, setGrade] = useState<number>(user?.user_metadata?.grade_id || 12);
  const [months, setMonths] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const totalUsd = months * PRICE_PER_MONTH_USD;
  const totalNis = months * PRICE_PER_MONTH_NIS;

  const handleFreeSelect = () => {
    toast.success("أنت تستمتع بالخطة المجانية حالياً!");
    navigate({ to: "/grades" });
  };

  const handleProSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("يرجى كتابة الاسم الكامل");
      return;
    }

    setLoading(true);
    try {
      const gradeName = GRADES.find((g) => g.id === grade)?.name || `الصف ${grade}`;
      
      // Submit pending request to Supabase
      const reqData = await submitSubscriptionRequest({
        fullName: fullName.trim(),
        gradeId: grade,
        gradeName,
        months,
        totalUsd,
        totalNis,
        userId: user?.id,
      });

      // Generate WhatsApp message and redirect
      const message = formatWhatsAppMessage({
        fullName: fullName.trim(),
        gradeName,
        months,
        totalUsd,
        totalNis,
        requestId: reqData?.id,
      });

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      
      toast.success("تم تسجيل الطلب! جارٍ تحويلك إلى الواتساب لإنهاء الاشتراك...");
      setShowModal(false);
      
      // Open WhatsApp in new tab
      window.open(whatsappUrl, "_blank");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "حدث خطأ أثناء تقديم الطلب، يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      {/* Header section */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-bold text-gold shadow-sm">
          <Crown className="h-4 w-4" /> خطط تناسب جميع الطلاب والمشرفين
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl bg-gradient-royal bg-clip-text text-transparent">
          اختر الخطة المناسبة لرحلتك التعليمية
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base leading-relaxed">
          احصل على أقصى استفادة من منصة المنارة المتجددة مع أدوات الذكاء الاصطناعي، المساعد الذكي، والاختبارات التفاعلية غير المحدودة.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-8 max-w-4xl mx-auto items-stretch">
        
        {/* Free Plan Card */}
        <div className="relative flex flex-col justify-between rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <Zap className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                مجاني دائماً
              </span>
            </div>

            <h2 className="text-2xl font-bold">الخطة المجانية</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              الوصول للدروس الأساسية والمكتبة والمجموعات الطلابية.
            </p>

            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">0$</span>
              <span className="text-xs text-muted-foreground">/ مجاناً مدى الحياة</span>
            </div>

            <div className="space-y-3 mb-8 border-t border-border pt-6">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">تتضمن الخطة المجانية:</p>
              {FREE_FEATURES.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleFreeSelect}
            className="w-full rounded-2xl border border-border bg-background py-3.5 px-4 text-sm font-bold text-foreground transition-all hover:bg-accent hover:border-accent-foreground/20 flex items-center justify-center gap-2"
          >
            <span>متابعة بالخطة المجانية</span>
            <ArrowRight className="h-4 w-4 rotate-180" />
          </button>
        </div>

        {/* Pro Plan Card (Highlighted) */}
        <div className="relative flex flex-col justify-between rounded-3xl border-2 border-gold/60 bg-card p-6 md:p-8 shadow-luxury relative overflow-hidden transition-all duration-300 hover:scale-[1.01]">
          {/* Badge */}
          <div className="absolute top-0 right-0 left-0 bg-gradient-royal py-1.5 text-center text-xs font-extrabold text-gold tracking-wide">
            ✨ الخطة الموصى بها لأعلى تفوق
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-2xl bg-gradient-gold p-3 text-royal-deep shadow-gold">
                <Crown className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-gold/15 border border-gold/30 px-3 py-1 text-xs font-bold text-gold">
                الخطة الاحترافية Pro
              </span>
            </div>

            <h2 className="text-2xl font-bold flex items-center gap-2">
              خطة المحترفين (Pro)
              <Sparkles className="h-5 w-5 text-gold animate-pulse" />
            </h2>
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              وصول غير محدود لكل أدوات الذكاء الاصطناعي والميزات الحصرية.
            </p>

            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gold">1$</span>
              <span className="text-sm font-semibold text-muted-foreground">أو 3 شيكل</span>
              <span className="text-xs text-muted-foreground">/ شهرياً فقط</span>
            </div>

            <div className="space-y-3 mb-8 border-t border-border pt-6">
              <p className="text-xs font-bold text-gold uppercase tracking-wider mb-2">جميع ميزات Pro الحصرية:</p>
              {PRO_FEATURES.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full rounded-2xl bg-gradient-gold py-3.5 px-4 text-sm font-extrabold text-royal-deep shadow-gold hover:opacity-95 transition-all flex items-center justify-center gap-2 text-base"
          >
            <MessageCircle className="h-5 w-5" />
            <span>متابعة واشتراك عبر الواتساب</span>
          </button>
        </div>

      </div>

      {/* Guarantee and Support Footer */}
      <div className="mt-12 rounded-2xl border border-border bg-card/60 p-6 text-center max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right">
          <ShieldCheck className="h-8 w-8 text-gold shrink-0" />
          <div>
            <div className="text-sm font-bold">تفعيل فوري وسهل</div>
            <div className="text-xs text-muted-foreground">يتم تفعيل حسابك فور استلام الطلب من قبل إدارة منصة المنارة.</div>
          </div>
        </div>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-accent transition-colors shrink-0"
        >
          <HelpCircle className="h-4 w-4 text-gold" />
          <span>لديك استفسار؟ تواصل معنا</span>
        </a>
      </div>

      {/* Subscription Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-gold/40 bg-card p-6 md:p-8 shadow-luxury space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-gradient-gold p-2 text-royal-deep">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold">طلب اشتراك الخطة الاحترافية (Pro)</h3>
                  <p className="text-xs text-muted-foreground">أدخل بياناتك لحساب التكلفة وإرسال الطلب عبر الواتساب</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gold" /> الاسم الكامل
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل الثلاثي"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-gold" /> الصف الدراسي
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  {GRADES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gold" /> مدة الاشتراك (بالأشهر)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonths(m)}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        months === m
                          ? "border-gold bg-gradient-royal text-gold shadow-sm"
                          : "border-border bg-background hover:bg-accent"
                      }`}
                    >
                      {m} {m === 1 ? "شهر" : m === 3 ? "3 أشهر" : m === 6 ? "6 أشهر" : "سنة كاملة"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calculator className="h-3.5 w-3.5 text-gold" /> سعر الشهر الواحد:</span>
                  <span>1$ / 3 شيكل</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold border-t border-gold/20 pt-2">
                  <span>التكلفة الإجمالية ({months} شهر):</span>
                  <span className="text-base text-gold font-extrabold">{totalUsd}$ (حوالي {totalNis} شيكل)</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 rounded-xl border border-border py-2.5 text-xs font-bold hover:bg-accent"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 rounded-xl bg-gradient-gold py-2.5 text-xs font-extrabold text-royal-deep shadow-gold hover:opacity-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{loading ? "جارٍ المعالجة..." : "إرسال عبر الواتساب"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}