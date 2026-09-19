import { useEffect, useState } from "react";
import "./brand-logo.css";

export const BRAND_FONT_VARIANT_KEY = "klocky-brand-logo-variant";

export type BrandLogoVariantId = "inline" | "stack-1";

type BrandLogoVariant = {
  id: BrandLogoVariantId;
  label: string;
  src: string;
};

export const BRAND_LOGO_VARIANTS: BrandLogoVariant[] = [
  {
    id: "inline",
    label: "Inline",
    src: "/brand/klocky-logo-inline.svg",
  },
  {
    id: "stack-1",
    label: "Stack 1",
    src: "/brand/klocky-logo-stack-1.svg",
  },
];

function readStoredVariant(): BrandLogoVariantId {
  if (typeof window === "undefined") return "inline";
  const stored = window.sessionStorage.getItem(BRAND_FONT_VARIANT_KEY);
  return BRAND_LOGO_VARIANTS.some((variant) => variant.id === stored)
    ? (stored as BrandLogoVariantId)
    : "inline";
}

type BrandLogoProps = {
  compareFonts?: boolean;
  className?: string;
};

export function BrandLogo({ compareFonts = false, className }: BrandLogoProps) {
  const [variantId, setVariantId] = useState<BrandLogoVariantId>(readStoredVariant);
  const variant =
    BRAND_LOGO_VARIANTS.find((entry) => entry.id === variantId) ??
    BRAND_LOGO_VARIANTS[0];

  useEffect(() => {
    window.sessionStorage.setItem(BRAND_FONT_VARIANT_KEY, variantId);
  }, [variantId]);

  const shellClass = [
    "brand-logo-shell",
    compareFonts ? "brand-logo-shell--compare" : "brand-logo-shell--compact",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <div className="brand-logo-preview">
        <img
          className={
            variant.id === "inline"
              ? "brand-logo-art brand-logo-art--inline"
              : "brand-logo-art"
          }
          src={variant.src}
          alt="Klocky by humin"
          draggable={false}
        />
      </div>
      {compareFonts && (
        <div
          className="brand-logo-toggle"
          role="tablist"
          aria-label="Compare Klocky logo marks"
        >
          {BRAND_LOGO_VARIANTS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={entry.id === variantId}
              onClick={() => setVariantId(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
