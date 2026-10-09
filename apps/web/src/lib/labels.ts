export const VARIANT_LABELS: Record<string, string> = {
  COMMON: "Ortak (Boşnakça / Sırpça / Hırvatça / Karadağça)",
  BS: "Boşnakça",
  HR: "Hırvatça",
  SR: "Sırpça",
  CNR: "Karadağça",
};

export function variantLabel(code?: string | null) {
  if (!code) return "Ortak";
  return VARIANT_LABELS[code] || code;
}
