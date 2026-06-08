"use client";

import { useState } from "react";

const DEFAULT_AVATAR = "/images/default-avatar.png";

type Props = {
  link: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
};

export function PlayerAvatar({ link, name, size = 40, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  const src =
    link && !failed
      ? `/api/player-avatar/image?link=${encodeURIComponent(link)}`
      : DEFAULT_AVATAR;

  const imageClassName = `block rounded-full object-cover bg-[var(--draft-surface-4)] ${className}`;

  const image = (
    <img
      src={src}
      alt={`${name} profile`}
      width={size}
      height={size}
      className={imageClassName}
      onError={() => setFailed(true)}
    />
  );

  const frameClassName =
    "inline-flex shrink-0 rounded-full ring-1 ring-[var(--draft-divider)] transition-[box-shadow]";

  if (!link) {
    return <span className={frameClassName}>{image}</span>;
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`${frameClassName} hover:ring-2 hover:ring-[var(--draft-accent)]/55`}
      aria-label={`Open ${name}'s profile`}
    >
      {image}
    </a>
  );
}

export function TeamAvatar({
  name,
  color,
  size = 44,
  className = "",
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, var(--draft-bg, #060b14)))`,
      }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
