import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Zap, Crown, ShieldCheck, Sparkles, Star, ArrowLeft } from "lucide-react";
import { SUBSCRIPTION_PLANS, useSubscription } from "@/lib/subscriptions";
import { toast } from "sonner";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "خطط الاشتراك والأسعار | الأوائل الكويتية" },
      { name: "description", content: "اختر الخطة المناسبة لك للاستفادة الكاملة من المنصة والذكاء الاصطناعي والمواد التعليمية الشاملة." },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { plan: currentPlan, upgradePlan } = useSubscription();

  const handleSubscribe = async (planId: string) => {
    if (planId === currentPlan) {
      toast.info("أنت مشترك بالفعل في هذه الخطة!");
      return;
    }
    toast.loading("جارٍ توجيهك لنظام الدفع...", { id: "sub-toast" });
    try {
      await upgradePlan(planId);
      toast.success("تم التحديث بنجاح!", { id: "sub-toast" });
    } catch {
      toast.error("حدث خطأ أثناء إجراء العملية، يرجى المحاولة لاحقاً.", { id: "sub-toast" });
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 text-right">
      {/* Header Section */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-semibold mb-4">
          <Sparkles className="w-4 h-4" />
          <span>خطط وعضويات المناهج الكويتية</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4">
          اختر الخطة التي تناسب رحلتك التعليمية
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
          احصل على دخول غير محدود للمذكرات، الامتحانات التفاعلية، معلم الذكاء الاصطناعي الذكي، والحلول النموذجية.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isPopular = plan.isPopular;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-3xl p-6 md:p-8 transition-all duration-300 border ${
                isPopular
                  ? "bg-card border-gold shadow-luxury scale-105 z-10"
                  : "bg-card/80 border-border hover:border-gold/50"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 right-1/2 translate-x-1/2 bg-gradient-gold text-black font-extrabold text-xs px-4 py-1.5 rounded-full shadow-gold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-black" /> الأكثر شعبية
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  {plan.id === "pro" && <Zap className="w-6 h-6 text-gold" />}
                  {plan.id === "ultra" && <Crown className="w-6 h-6 text-amber-500" />}
                  {plan.id === "free" && <ShieldCheck className="w-6 h-6 text-muted-foreground" />}
                </div>

                <p className="text-xs text-muted-foreground mb-6 min-h-[36px]">
                  {plan.description}
                </p>

                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-foreground">{plan.price}</span>
                  <span className="text-sm font-semibold text-muted-foreground">{plan.currency}</span>
                  {plan.period && (
                    <span className="text-xs text-muted-foreground mr-1">/ {plan.period}</span>
                  )}
                </div>

                <div className="border-t border-border pt-6 mb-8">
                  <p className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">
                    المميزات المشمولة:
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                        <div className="mt-0.5 rounded-full bg-gold/10 p-1 text-gold shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
                      : isPopular
                      ? "bg-gradient-gold text-black hover:opacity-95 shadow-gold"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isCurrent ? "خطتك الحالية" : `الاشتراك في ${plan.name}`}
                  {!isCurrent && <ArrowLeft className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Support Banner */}
      <div className="max-w-3xl mx-auto mt-16 p-6 md:p-8 rounded-2xl bg-card border border-border text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">هل لديك أي استفسارات؟</h2>
        <p className="text-sm text-muted-foreground mb-4">
          فريق الدعم الفني متواجد لمساعدتك في اختيار الخطة المناسبة والإجابة على تساؤلاتك.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gold text-sm font-bold hover:underline"
        >
          العودة للرئيسية <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}