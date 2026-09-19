import type { ComponentType, SVGProps } from "react";
import { uiPx } from "../utils/uiScale";

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
  const scaled = uiPx(size);
  return (
    <Icon
      width={scaled}
      height={scaled}
      className={["pika-icon", className].filter(Boolean).join(" ")}
      aria-hidden
      {...rest}
    />
  );
}
