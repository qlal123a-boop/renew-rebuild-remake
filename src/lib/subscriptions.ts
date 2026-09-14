import { supabase } from "@/integrations/supabase/client";

export const MONTHLY_RATE_USD = 1;
export const MONTHLY_RATE_NIS = 3;
export const WHATSAPP_SUPPORT_NUMBER = "970599000000";

export type SubscriptionStatus = "pending" | "approved" | "rejected";

export interface SubscriptionRequest {
  id: string;
  user_id?: string;
  full_name: string;
  grade_level: string;
  duration_months: number;
  total_usd: number;
  total_nis: number;
  phone?: string;
  status: SubscriptionStatus;
  created_at: string;
  expires_at?: string;
}

export interface PlanFeature {
  id: string;
  title: string;
  description: string;
  free: boolean;
  pro: boolean;
}

export const DEFAULT_PLAN_FEATURES: PlanFeature[] = [
  {
    id: "lessons",
    title: "تصفح الدروس والكورسات",
    description: "الوصول إلى الشروحات والفيديوهات التعليمية لكافة المراحل",
    free: true,
    pro: true,
  },
  {
    id: "summaries",
    title: "الملخصات وأوراق العمل",
    description: "استعراض وتحميل الملخصات الأساسية والأنشطة الإثرائية",
    free: true,
    pro: true,
  },
  {
    id: "ai_tutor",
    title: "المعلم الذكي AI",
    description: "تفاعل مباشر مع المساعد الذكي لحل المسائل واستفسارات المواد",
    free: false,
    pro: true,
  },
  {
    id: "quiz_generator",
    title: "مولّد الاختبارات التفاعلية",
    description: "إنشاء اختبارات مخصصة مع نظام التقييم الفوري وتوضيح الإجابات",
    free: false,
    pro: true,
  },
  {
    id: "smart_board",
    title: "السبورة الذكية وأدوات الدراسة",
    description: "استخدام أدوات التخطيط، مؤقت بومودورو، وحاسبة المعدل المتقدمة",
    free: true,
    pro: true,
  },
  {
    id: "ad_free",
    title: "تجربة بدون إعلانات أو قيود",
    description: "تصفح سريع وسلس بدون أي معوقات بصرية أو إعلانية",
    free: false,
    pro: true,
  },
  {
    id: "priority_support",
    title: "دعم فني وتوجيه أسبوعي",
    description: "تواصل مباشر مع مشرفي المنارة للحصول على توجيه دراسي خاص",
    free: false,
    pro: true,
  },
];

/**
 * حساب التكلفة بناءً على عدد الأشهر
 */
export function calculateSubscriptionCost(months: number) {
  const validMonths = Math.max(1, Math.floor(months || 1));
  return {
    months: validMonths,
    totalUsd: validMonths * MONTHLY_RATE_USD,
    totalNis: validMonths * MONTHLY_RATE_NIS,
  };
}

/**
 * إنشاء رابط الواتساب المحسّن لإرسال تفاصيل الطلب
 */
export function buildWhatsAppSubscriptionUrl(data: {
  fullName: string;
  gradeLevel: string;
  durationMonths: number;
  totalUsd: number;
  totalNis: number;
  requestId?: string;
  phoneNumber?: string;
}): string {
  const targetPhone = data.phoneNumber || WHATSAPP_SUPPORT_NUMBER;
  
  const text = `🌟 *طلب اشتراك جديد في المنارة المتجددة (Pro)* 🌟\n\n` +
    `👤 *الاسم الكامل:* ${data.fullName.trim()}\n` +
    `🎓 *الصف الدراسي:* ${data.gradeLevel.trim()}\n` +
    `⏳ *مدة الاشتراك:* ${data.durationMonths} ${data.durationMonths === 1 ? 'شهر' : 'أشهر'}\n` +
    `💰 *الإجمالي:* $${data.totalUsd} دولار (${data.totalNis} شيكل)\n` +
    (data.requestId ? `🔑 *رقم الطلب:* #${data.requestId.slice(0, 8)}\n\n` : `\n`) +
    `يرجى تأكيد طلب الاشتراك وتزويدي ببيانات الدفع المتاحة لتفعيل الحساب. شكراً لكم!`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * حفظ طلب اشتراك جديد (في Supabase أو التخزين المحلي كنسخة احتياطية)
 */
export async function createSubscriptionRequest(req: {
  userId?: string;
  fullName: string;
  gradeLevel: string;
  durationMonths: number;
  phone?: string;
}): Promise<{ success: boolean; data?: SubscriptionRequest; error?: string }> {
  const cost = calculateSubscriptionCost(req.durationMonths);

  const payload = {
    user_id: req.userId || null,
    full_name: req.fullName.trim(),
    grade_level: req.gradeLevel,
    duration_months: cost.months,
    total_usd: cost.totalUsd,
    total_nis: cost.totalNis,
    phone: req.phone || null,
    status: "pending" as SubscriptionStatus,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("subscription_requests")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn("Supabase insert warning, fallback to localStorage:", error.message);
      const localItem: SubscriptionRequest = {
        id: "req_" + Date.now().toString(36),
        ...payload,
      };
      saveLocalSubscriptionRequest(localItem);
      return { success: true, data: localItem };
    }

    return { success: true, data: data as SubscriptionRequest };
  } catch (e: any) {
    const localItem: SubscriptionRequest = {
      id: "req_" + Date.now().toString(36),
      ...payload,
    };
    saveLocalSubscriptionRequest(localItem);
    return { success: true, data: localItem };
  }
}

/**
 * جلب جميع طلبات الاشتراك للوحة التحكم
 */
export async function fetchSubscriptionRequests(): Promise<SubscriptionRequest[]> {
  try {
    const { data, error } = await supabase
      .from("subscription_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return getLocalSubscriptionRequests();
    }

    const localRequests = getLocalSubscriptionRequests();
    const mergedMap = new Map<string, SubscriptionRequest>();
    
    data.forEach((item) => mergedMap.set(item.id, item as SubscriptionRequest));
    localRequests.forEach((item) => {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, item);
      }
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch {
    return getLocalSubscriptionRequests();
  }
}

/**
 * تحديث حالة طلب الاشتراك (موافقة أو رفض)
 */
export async function updateSubscriptionStatus(
  id: string,
  status: "approved" | "rejected",
  durationMonths = 1
): Promise<boolean> {
  const expiresAt = status === "approved"
    ? new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  try {
    const { error } = await supabase
      .from("subscription_requests")
      .update({
        status,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      updateLocalSubscriptionRequestStatus(id, status, expiresAt || undefined);
    } else {
      updateLocalSubscriptionRequestStatus(id, status, expiresAt || undefined);
    }

    if (status === "approved") {
      try {
        const { data: requestData } = await supabase
          .from("subscription_requests")
          .select("user_id")
          .eq("id", id)
          .maybeSingle();

        if (requestData?.user_id) {
          await supabase
            .from("profiles")
            .update({
              is_pro: true,
              pro_expires_at: expiresAt,
            })
            .eq("id", requestData.user_id);
        }
      } catch {
        // profile update optional
      }
    }

    return true;
  } catch {
    updateLocalSubscriptionRequestStatus(id, status, expiresAt || undefined);
    return true;
  }
}

// Local Storage Helpers
const LOCAL_STORAGE_KEY = "almanara_sub_requests_v1";
const FEATURES_STORAGE_KEY = "almanara_plan_features_v1";

function getLocalSubscriptionRequests(): SubscriptionRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSubscriptionRequest(item: SubscriptionRequest) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalSubscriptionRequests();
    list.unshift(item);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function updateLocalSubscriptionRequestStatus(
  id: string,
  status: SubscriptionStatus,
  expiresAt?: string
) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalSubscriptionRequests();
    const index = list.findIndex((r) => r.id === id);
    if (index !== -1) {
      list[index].status = status;
      if (expiresAt) list[index].expires_at = expiresAt;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}

/**
 * جلب وحفظ مميزات الخطط
 */
export function getSavedPlanFeatures(): PlanFeature[] {
  if (typeof window === "undefined") return DEFAULT_PLAN_FEATURES;
  try {
    const raw = localStorage.getItem(FEATURES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PLAN_FEATURES;
  } catch {
    return DEFAULT_PLAN_FEATURES;
  }
}

export function savePlanFeatures(features: PlanFeature[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(features));
    return true;
  } catch {
    return false;
  }
}