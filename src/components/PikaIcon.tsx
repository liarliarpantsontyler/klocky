import type { ComponentType, SVGProps } from "react";

export function PikaIcon({
  icon: Icon,
  size = 20,
  className,
  ...rest
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  size?: number;
  className?: string;
} & SVGProps<SVGSVGElement>) {
  return (
    <Icon
      width={size}
      height={size}
      className={["pika-icon", className].filter(Boolean).join(" ")}
      aria-hidden
      {...rest}
    />
  );
}
