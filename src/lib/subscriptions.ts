import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionRequest {
  id: string;
  user_id?: string | null;
  full_name: string;
  grade_name: string;
  months: number;
  total_usd: number;
  total_ils: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at?: string | null;
  expires_at?: string | null;
  phone_number?: string | null;
}

export interface PlanFeature {
  id: string;
  name: string;
  free: string | boolean;
  pro: string | boolean;
  category?: string;
  highlight?: boolean;
}

export const MONTHLY_PRICE_USD = 1;
export const MONTHLY_PRICE_ILS = 3;
export const SUPPORT_WHATSAPP_NUMBER = "970599000000";

export function calculateProCost(months: number) {
  const safeMonths = Math.max(1, months || 1);
  return {
    months: safeMonths,
    usd: safeMonths * MONTHLY_PRICE_USD,
    ils: safeMonths * MONTHLY_PRICE_ILS,
  };
}

export const DEFAULT_PLAN_FEATURES: PlanFeature[] = [
  { id: "1", name: "تصفح المناهج والدروس", free: "متاح مجاناً", pro: "متاح بدون إعلانات", category: "المحتوى" },
  { id: "2", name: "تحميل الملخصات وأوراق العمل", free: "محدود (5 يومياً)", pro: "غير محدود بضغطة زر", category: "المحتوى", highlight: true },
  { id: "3", name: "المساعد التعليمي الذكي (AI Tutor)", free: "3 أسئلة / يومياً", pro: "أسئلة وإجابات غير محدودة", category: "الذكاء الاصطناعي", highlight: true },
  { id: "4", name: "مولد الاختبارات التفاعلية", free: "اختبار واحد يومياً", pro: "إنشاء اختبارات بلا حدود", category: "الذكاء الاصطناعي" },
  { id: "5", name: "السبورة الذكية التفاعلية", free: "أساسية", pro: "كامل الميزات والتحليلات", category: "الأدوات" },
  { id: "6", name: "إصدار الشهادات والأوسمة", free: "شهادة أساسية", pro: "شهادات فاخرة ووسام Pro ذهبي", category: "المميزات", highlight: true },
  { id: "7", name: "الدعم الفني المباشر", free: "غير متاح", pro: "دعم مباشر عبر الواتساب", category: "الدعم" },
];

export function buildWhatsAppMessage(data: {
  fullName: string;
  gradeName: string;
  months: number;
  totalUsd: number;
  totalIls: number;
  requestId?: string;
}): string {
  const text = `السلام عليكم ورحمة الله وبركاته،\nأرغب في تفعيل اشتراك الخطة المدفوعة (Pro) في منصة المنارة المتجددة التعليمية ✨\n\n📌 *بيانات الطلب:*\n- **الاسم الكامل:** ${data.fullName}\n- **الصف الدراسي:** ${data.gradeName}\n- **مدة الاشتراك:** ${data.months} ${data.months === 1 ? "شهر" : "أشهر"}\n- **التكلفة الإجمالية:** ${data.totalUsd}$ (ما يعادل ${data.totalIls} شيكل)\n${data.requestId ? `- **رقم مرجع الطلب:** \`${data.requestId}\`\n` : ""}\nيرجى تأكيد الطلب وتفعيل اشتراك Pro لحسابي وشكراً جزيلاً!`;
  return text;
}

export function buildWhatsAppLink(data: {
  fullName: string;
  gradeName: string;
  months: number;
  totalUsd: number;
  totalIls: number;
  requestId?: string;
  phoneNumber?: string;
}): string {
  const phone = data.phoneNumber || SUPPORT_WHATSAPP_NUMBER;
  const message = buildWhatsAppMessage(data);
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
}

const LOCAL_STORAGE_KEY = "almanara_subscription_requests";
const FEATURES_STORAGE_KEY = "almanara_plan_features";

export async function fetchSubscriptionRequests(): Promise<SubscriptionRequest[]> {
  try {
    const { data, error } = await supabase
      .from("subscription_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as SubscriptionRequest[];
    }
  } catch {
    // Fallback to local storage if table is not configured yet
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  return [];
}

export async function submitSubscriptionRequest(payload: {
  userId?: string | null;
  fullName: string;
  gradeName: string;
  months: number;
}): Promise<{ success: boolean; request: SubscriptionRequest; whatsappUrl: string }> {
  const { usd, ils } = calculateProCost(payload.months);
  const newReq: SubscriptionRequest = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: payload.userId || null,
    full_name: payload.fullName,
    grade_name: payload.gradeName,
    months: payload.months,
    total_usd: usd,
    total_ils: ils,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from("subscription_requests").insert({
      id: newReq.id,
      user_id: newReq.user_id,
      full_name: newReq.full_name,
      grade_name: newReq.grade_name,
      months: newReq.months,
      total_usd: newReq.total_usd,
      total_ils: newReq.total_ils,
      status: "pending",
    });
  } catch (e) {
    console.warn("Supabase connection error fallback to localStorage:", e);
  }

  const existing = await fetchSubscriptionRequests();
  const updated = [newReq, ...existing.filter((r) => r.id !== newReq.id)];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

  const whatsappUrl = buildWhatsAppLink({
    fullName: newReq.full_name,
    gradeName: newReq.grade_name,
    months: newReq.months,
    totalUsd: newReq.total_usd,
    totalIls: newReq.total_ils,
    requestId: newReq.id,
  });

  return { success: true, request: newReq, whatsappUrl };
}

export async function updateSubscriptionStatus(
  requestId: string,
  status: "approved" | "rejected"
): Promise<boolean> {
  const now = new Date();
  let expiresAt: string | null = null;

  const existingRequests = await fetchSubscriptionRequests();
  const targetReq = existingRequests.find((r) => r.id === requestId);

  if (targetReq && status === "approved") {
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + (targetReq.months || 1));
    expiresAt = expDate.toISOString();
  }

  try {
    await supabase
      .from("subscription_requests")
      .update({
        status,
        approved_at: status === "approved" ? now.toISOString() : null,
        expires_at: expiresAt,
      })
      .eq("id", requestId);

    if (targetReq?.user_id && status === "approved") {
      await supabase
        .from("profiles")
        .update({
          is_pro: true,
          pro_expires_at: expiresAt,
        })
        .eq("id", targetReq.user_id);
    }
  } catch (e) {
    console.warn("Supabase status update fallback:", e);
  }

  const updated = existingRequests.map((r) => {
    if (r.id === requestId) {
      return {
        ...r,
        status,
        approved_at: status === "approved" ? now.toISOString() : undefined,
        expires_at: expiresAt || undefined,
      };
    }
    return r;
  });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

  return true;
}

export async function fetchPlanFeatures(): Promise<PlanFeature[]> {
  const stored = localStorage.getItem(FEATURES_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  return DEFAULT_PLAN_FEATURES;
}

export async function savePlanFeatures(features: PlanFeature[]): Promise<boolean> {
  localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(features));
  return true;
}