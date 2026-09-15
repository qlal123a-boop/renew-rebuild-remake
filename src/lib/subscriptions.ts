import { supabase } from "@/integrations/supabase/client";

export interface PlanDetails {
  id: "free" | "pro";
  name: string;
  badge?: string;
  priceUSD: number;
  priceILS: number;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  popular?: boolean;
}

export const PLANS: Record<"free" | "pro", PlanDetails> = {
  free: {
    id: "free",
    name: "الخطة المجانية",
    priceUSD: 0,
    priceILS: 0,
    period: "مدى الحياة",
    description: "الخيار المثالي للبدء والاستفادة من المحتوى الأساسي والدروس المتاحة للجميع.",
    features: [
      "تصفح جميع المناهج والصفوف الدراسية",
      "مشاهدة الدروس والكورسات الفيديوية",
      "تنزيل أوراق العمل والملخصات المجانية",
      "استخدام حاسبة المعدل وجدول الدراسة",
      "وصول محدودة للمساعد التعليمي الذكي",
      "المشاركة في الألعاب التعليمية"
    ],
    ctaText: "متابعة بالخطة المجانية"
  },
  pro: {
    id: "pro",
    name: "الخطة المدفوعة Pro",
    badge: "الأكثر شعبية",
    priceUSD: 1,
    priceILS: 3,
    period: "شهرياً",
    description: "تجربة تعليمية فائقة الجودة بدون حدود، مع ميزات الذكاء الاصطناعي الكاملة بشهادات معتمدة.",
    features: [
      "كل مميزات الخطة المجانية",
      "استخدام غير محدود للمساعد الذكي AI Tutor",
      "توليد اختبارات ذكية غير محدودة مع التصحيح الفوري",
      "استخراج وتنزيل الشهادات المعتمدة لإتمام الكورسات",
      "الوصول للسبورة الذكية وإنشاء الغرف الدراسية",
      "تخزين غير محدود للوظائف والمهام والملخصات",
      "دعم فني وتوجيه تعليمي مباشر عبر الواتساب"
    ],
    ctaText: "متابعة واشتراك",
    popular: true
  }
};

export const WHATSAPP_CONTACT_NUMBER = "+972590000000";

export function calcPrice(months: number) {
  const m = Math.max(1, Math.round(months || 1));
  return {
    usd: m * PLANS.pro.priceUSD,
    ils: m * PLANS.pro.priceILS
  };
}

export function buildWhatsAppUrl(fullName: string, grade: string, months: number, totalUsd: number, totalIls: number, phone: string = WHATSAPP_CONTACT_NUMBER) {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const message = `السلام عليكم ورحمة الله وبركاته،
أود الاشتراك في *الخطة المدفوعة (Pro)* لموقع المنارة التعليمي:

👤 *الاسم الكامل:* ${fullName}
🎓 *الصف الدراسي:* ${grade}
📅 *مدة الاشتراك:* ${months} ${months === 1 ? "شهر" : months === 2 ? "شهريين" : "أشهر"}
💰 *المبلغ الإجمالي:* $${totalUsd} دولار (${totalIls} شيكل)

يرجى تفعيل اشتراكي وتأكيد الطلب. شكراً لكم!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export interface SubscriptionRequest {
  id: string;
  user_id?: string | null;
  full_name: string;
  grade: string;
  months: number;
  price_usd: number;
  price_ils: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  expires_at?: string | null;
}

const STORAGE_KEY_REQUESTS = "almanara_subscription_requests";

export async function submitSubscriptionRequest(data: {
  user_id?: string | null;
  full_name: string;
  grade: string;
  months: number;
}): Promise<SubscriptionRequest> {
  const prices = calcPrice(data.months);
  const newReq: SubscriptionRequest = {
    id: "sub_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    user_id: data.user_id || null,
    full_name: data.full_name,
    grade: data.grade,
    months: data.months,
    price_usd: prices.usd,
    price_ils: prices.ils,
    status: "pending",
    created_at: new Date().toISOString()
  };

  try {
    const { data: inserted, error } = await supabase
      .from("subscription_requests")
      .insert({
        user_id: newReq.user_id,
        full_name: newReq.full_name,
        grade: newReq.grade,
        months: newReq.months,
        price_usd: newReq.price_usd,
        price_ils: newReq.price_ils,
        status: newReq.status
      })
      .select()
      .single();

    if (!error && inserted) {
      return inserted as SubscriptionRequest;
    }
  } catch {
    // Fallback if supabase table isn't present
  }

  const existing = getLocalRequests();
  existing.unshift(newReq);
  saveLocalRequests(existing);
  return newReq;
}

export async function fetchSubscriptionRequests(): Promise<SubscriptionRequest[]> {
  try {
    const { data, error } = await supabase
      .from("subscription_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as SubscriptionRequest[];
    }
  } catch {
    // ignore
  }

  return getLocalRequests();
}

export async function approveSubscriptionRequest(id: string, months: number): Promise<boolean> {
  const now = new Date();
  const expires = new Date(now.setMonth(now.getMonth() + months)).toISOString();

  try {
    const { error } = await supabase
      .from("subscription_requests")
      .update({ status: "approved", expires_at: expires })
      .eq("id", id);

    if (!error) return true;
  } catch {
    // ignore
  }

  const items = getLocalRequests();
  const index = items.findIndex((r) => r.id === id);
  if (index !== -1) {
    items[index].status = "approved";
    items[index].expires_at = expires;
    saveLocalRequests(items);
    return true;
  }
  return false;
}

export async function rejectSubscriptionRequest(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("subscription_requests")
      .update({ status: "rejected" })
      .eq("id", id);

    if (!error) return true;
  } catch {
    // ignore
  }

  const items = getLocalRequests();
  const index = items.findIndex((r) => r.id === id);
  if (index !== -1) {
    items[index].status = "rejected";
    saveLocalRequests(items);
    return true;
  }
  return false;
}

function getLocalRequests(): SubscriptionRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REQUESTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRequests(reqs: SubscriptionRequest[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(reqs));
  } catch {
    // ignore
  }
}

export interface PlanFeature {
  id: string;
  name: string;
  category: string;
  description: string;
  freeAllowed: boolean;
  proAllowed: boolean;
}

export const DEFAULT_PLAN_FEATURES: PlanFeature[] = [
  {
    id: "curriculum_browse",
    name: "تصفح المناهج والصفوف",
    category: "المحتوى",
    description: "عرض كافة الكتب والمناهج والدروس المسجلة",
    freeAllowed: true,
    proAllowed: true
  },
  {
    id: "ai_tutor_unlimited",
    name: "المعلم الذكي غير المحدود",
    category: "الذكاء الاصطناعي",
    description: "إمكانية توجيه أسئلة غير محدودة للمعلم الذكي",
    freeAllowed: false,
    proAllowed: true
  },
  {
    id: "quiz_generator",
    name: "مولد الاختبارات الذكية",
    category: "الذكاء الاصطناعي",
    description: "إنشاء اختبارات مخصصة من أي درس مع تصحيح فوري",
    freeAllowed: false,
    proAllowed: true
  },
  {
    id: "smart_board",
    name: "السبورة الذكية والتفاعلية",
    category: "أدوات التعلم",
    description: "استخدام السبورة التفاعلية الرسمية وحفظ السبورات",
    freeAllowed: true,
    proAllowed: true
  },
  {
    id: "certificate_export",
    name: "شهادات إتمام الكورسات",
    category: "الشهادات",
    description: "إصدار وتنزيل شهادات إنجاز معتمدة بصيغة PDF",
    freeAllowed: false,
    proAllowed: true
  },
  {
    id: "offline_downloads",
    name: "تنزيل الأوراق والملخصات",
    category: "المكتبة",
    description: "تنزيل ملخصات الدروس وأوراق العمل بجودة عالية",
    freeAllowed: true,
    proAllowed: true
  },
  {
    id: "whatsapp_direct_support",
    name: "الدعم والمتابعة المباشرة",
    category: "الدعم",
    description: "تواصل مباشر عبر الواتساب للاستفسارات والأبحاث",
    freeAllowed: false,
    proAllowed: true
  }
];

const STORAGE_KEY_FEATURES = "almanara_plan_features";

export function getPlanFeatures(): PlanFeature[] {
  if (typeof window === "undefined") return DEFAULT_PLAN_FEATURES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEATURES);
    return raw ? JSON.parse(raw) : DEFAULT_PLAN_FEATURES;
  } catch {
    return DEFAULT_PLAN_FEATURES;
  }
}

export function savePlanFeatures(features: PlanFeature[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_FEATURES, JSON.stringify(features));
  } catch {
    // ignore
  }
}