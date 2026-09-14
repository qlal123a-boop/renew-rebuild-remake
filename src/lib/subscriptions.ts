export type SubscriptionTier = "free" | "pro" | "vip";

export interface PlanFeature {
  id: string;
  text: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  nameEn: string;
  badge?: string;
  priceMonthly: number;
  priceYearly: number;
  popular?: boolean;
  description: string;
  features: string[];
}

export interface UserSubscription {
  id?: string;
  userId: string;
  tier: SubscriptionTier;
  status: "active" | "canceled" | "expired" | "trialing";
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentMethod?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "الباقة المجانية",
    nameEn: "Free Plan",
    priceMonthly: 0,
    priceYearly: 0,
    description: "الوصول للمحتوى التعليمي الأساسي والأدوات مجاناً",
    features: [
      "تصفح الكتب والمذكرات الدراسية",
      "استخدام الحاسبة الدراسية ودرجات GPA",
      "المدرس الذكي (عدد محدود من الأسئلة)",
      "إنشاء الملاحظات والمهام اليومية"
    ]
  },
  {
    id: "pro",
    name: "الباقة الاحترافية",
    nameEn: "Pro Plan",
    popular: true,
    badge: "الأكثر شعبية",
    priceMonthly: 15,
    priceYearly: 120,
    description: "تجربة تعليمية متكاملة وبدون حدود للمراحل الدراسية",
    features: [
      "جميع مميزات الباقة المجانية",
      "استخدام غير محدود للمدرس الذكي وتوليد الاختبارات",
      "تحميل الملفات والمكتبة بصيغة PDF عالية الجودة",
      "سبورة ذكية متقدمة مع حفظ المستندات",
      "جلسات بومودورو متقدمة مع إحصائيات دقيقة",
      "دعم فني أولوية"
    ]
  },
  {
    id: "vip",
    name: "الباقة الذهبية VIP",
    nameEn: "VIP Plan",
    badge: "مميز جداً",
    priceMonthly: 30,
    priceYearly: 250,
    description: "أعلى مستوى من الخدمات التعليمية مع متابعة خاصة ودعم مباشر",
    features: [
      "جميع مميزات الباقة الاحترافية",
      "مراجعات مخصصة واختبارات قياسية ذكية",
      "إمكانية طلب ملخصات وشروحات خاصة",
      "دخول حصري للورش المباشرة والألعاب التعليمية المتقدمة",
      "دعم فني خاص 24/7 عبر واتساب",
      "إتاحة الحساب على أكثر من جهاز بالتوازي"
    ]
  }
];

export function isSubscribed(subscription: UserSubscription | null | undefined): boolean {
  if (!subscription) return false;
  if (subscription.tier === "free") return true;
  if (subscription.status !== "active" && subscription.status !== "trialing") return false;
  const now = new Date();
  const endDate = new Date(subscription.endDate);
  return endDate >= now;
}

export function getPlanDetails(tier: SubscriptionTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.find((p) => p.id === tier) || SUBSCRIPTION_PLANS[0];
}

export function formatPrice(amount: number, currency = "د.ك"): string {
  if (amount === 0) return "مجاناً";
  return `${amount} ${currency}`;
}