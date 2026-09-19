import "./brand-logo.css";

const INLINE_LOGO_SRC = "/brand/klocky-logo-inline.svg";

type BrandLogoProps = {
  hero?: boolean;
  /** Collection / app header — larger than compact nav marks */
  header?: boolean;
  className?: string;
};

export function BrandLogo({
  hero = false,
  header = false,
  className,
}: BrandLogoProps) {
  const shellClass = [
    "brand-logo-shell",
    hero
      ? "brand-logo-shell--hero"
      : header
        ? "brand-logo-shell--header"
        : "brand-logo-shell--compact",
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
