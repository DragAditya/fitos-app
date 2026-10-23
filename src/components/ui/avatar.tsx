import { cn, initials, nameHue } from "@/lib/utils";

const sizes = {
  xs: "size-6 text-[9px]",
  sm: "size-8 text-[10px]",
  md: "size-10 text-[12px]",
  lg: "size-12 text-[14px]",
  xl: "size-16 text-[20px]",
  "2xl": "size-20 text-[24px]",
};

export function Avatar({
  name,
  src,
  size = "md",
  className,
  ring = false,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  const hue = nameHue(name);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold tracking-[-0.02em] text-white",
        sizes[size],
        ring && "ring-2 ring-white outline outline-1 outline-black/[0.04]",
        className,
      )}
      style={{
        backgroundImage: src
          ? undefined
          : `linear-gradient(135deg, hsl(${hue} 42% 42%), hsl(${hue + 26} 48% 28%))`,
      }}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
