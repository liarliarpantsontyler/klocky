import "./brand-logo.css";

const INLINE_LOGO_SRC = "/brand/klocky-logo-inline.svg";

type BrandLogoProps = {
  hero?: boolean;
  className?: string;
};

export function BrandLogo({ hero = false, className }: BrandLogoProps) {
  const shellClass = [
    "brand-logo-shell",
    hero ? "brand-logo-shell--hero" : "brand-logo-shell--compact",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <div className="brand-logo-preview">
        <img
          className="brand-logo-art"
          src={INLINE_LOGO_SRC}
          alt="Klocky by humin"
          draggable={false}
        />
      </div>
    </div>
  );
}
