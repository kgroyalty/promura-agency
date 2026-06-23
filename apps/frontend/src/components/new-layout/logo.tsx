'use client';

export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      className="mt-[8px] min-w-[60px] min-h-[60px]"
    >
      {/* Promura Agency mark: bold P with magenta period (white on dark rail) */}
      <g transform="translate(-2.35, 1.34) scale(0.3676)">
        <path
          d="M 20 15 L 20 135 L 42 135 L 42 90 L 75 90 C 102 90 121 75 121 53 C 121 30 102 15 75 15 Z M 42 33 L 73 33 C 88 33 99 41 99 53 C 99 64 88 72 73 72 L 42 72 Z"
          fill="#FFFFFF"
        />
        <circle cx="140" cy="125" r="16" fill="#ff3daa" />
      </g>
    </svg>
  );
};
