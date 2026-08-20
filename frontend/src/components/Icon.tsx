import type { ReactNode } from "react";

export type IconName =
  | "mic"
  | "micOff"
  | "stop"
  | "volume"
  | "volumeOff"
  | "moon"
  | "sun"
  | "send"
  | "globe"
  | "shield"
  | "alertTriangle"
  | "checkCircle"
  | "graduationCap"
  | "users"
  | "pencil"
  | "building"
  | "arrowRight"
  | "messageCircle";

const PATHS: Record<IconName, ReactNode> = {
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 19v3" />
    </>
  ),
  micOff: (
    <>
      <path d="M9 9v2a3 3 0 0 0 4.6 2.55M15 6.5V5a3 3 0 0 0-5.9-.8" />
      <path d="M5 10a7 7 0 0 0 9.7 6.45M19 10a7 7 0 0 1-.34 2.16" />
      <path d="M12 19v3" />
      <path d="M3 3l18 18" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  volume: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17.5 9.5l5 5M22.5 9.5l-5 5" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  send: <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  shield: <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3z" />,
  alertTriangle: (
    <>
      <path d="M12 3 2 21h20L12 3z" />
      <path d="M12 9.5v5M12 18h.01" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  graduationCap: (
    <>
      <path d="M2 9.5 12 5l10 4.5L12 14 2 9.5z" />
      <path d="M6 11.7V17c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.3" />
      <path d="M21 10v5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="9.5" r="2.6" />
      <path d="M15.3 12.3A4.6 4.6 0 0 1 20.5 16.6" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20z" />
      <path d="M13 7l4 4" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="10" height="18" rx="1" />
      <rect x="14" y="9" width="6" height="12" rx="1" />
      <path d="M7 7h1M10 7h1M7 11h1M10 11h1M7 15h1M10 15h1" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  messageCircle: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-.98L3 20l1.02-5.4A8.5 8.5 0 1 1 21 11.5z" />,
};

export default function Icon({
  name,
  size = 18,
  strokeWidth = 1.7,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
