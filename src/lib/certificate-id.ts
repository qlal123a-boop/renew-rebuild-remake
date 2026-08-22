/** Deterministic, human-readable certificate serial (same inputs → same ID). */
export function makeCertificateId(userId: string, courseId: string, completedAt: string): string {
  const seed = `${userId}|${courseId}|${completedAt}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const year = new Date(completedAt).getFullYear();
  return `AM-${year}-${h.toString(16).toUpperCase().padStart(8, "0")}`;
}
