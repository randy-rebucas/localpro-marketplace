import Image from "next/image";

type PortraitImageProps = {
  src: string;
  alt: string;
  size: number;
  className?: string;
  priority?: boolean;
};

/** Circular optimized portrait for homepage decorative avatars. */
export default function PortraitImage({ src, alt, size, className = "", priority }: PortraitImageProps) {
  const px = `${size}px`;
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-slate-200 shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={px}
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}
