"use client";

import { useEffect, useState, type KeyboardEvent } from "react";

const DEFAULT_AVATAR = "/images/default-avatar.png";

type Props = {
  playerId?: string | null;
  link: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
  /** When false, avatar is not clickable (recommended for public boards). */
  linkToProfile?: boolean;
};

function avatarImageSrc(playerId: string | null | undefined, link: string | null | undefined) {
  if (playerId) {
    return `/api/player-avatar/image?playerId=${encodeURIComponent(playerId)}`;
  }
  if (link) {
    return `/api/player-avatar/image?link=${encodeURIComponent(link)}`;
  }
  return null;
}

export function PlayerAvatar({
  playerId,
  link,
  name,
  size = 40,
  className = "",
  linkToProfile = true,
}: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [playerId, link]);

  const apiSrc = avatarImageSrc(playerId, link);
  const src = apiSrc && !failed ? apiSrc : DEFAULT_AVATAR;
  const profileUrl = link && linkToProfile ? link : null;

  const imageClassName = `block rounded-full object-cover bg-[var(--draft-surface-4)] ${className}`;

  const image = (
    <img
      src={src}
      alt={`${name} profile`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={imageClassName}
      onError={() => setFailed(true)}
    />
  );

  const frameClassName = [
    "inline-flex shrink-0 rounded-full ring-1 ring-[var(--draft-divider)] transition-[box-shadow]",
    profileUrl ? "cursor-pointer hover:ring-2 hover:ring-[var(--draft-accent)]/55" : "",
  ].join(" ");

  function openProfile() {
    if (!profileUrl) return;
    window.open(profileUrl, "_blank", "noopener,noreferrer");
  }

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (!profileUrl) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProfile();
    }
  }

  return (
    <span
      className={frameClassName}
      role={profileUrl ? "link" : undefined}
      tabIndex={profileUrl ? 0 : undefined}
      aria-label={profileUrl ? `Open ${name}'s profile` : undefined}
      onClick={profileUrl ? openProfile : undefined}
      onKeyDown={profileUrl ? onKeyDown : undefined}
    >
      {image}
    </span>
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
