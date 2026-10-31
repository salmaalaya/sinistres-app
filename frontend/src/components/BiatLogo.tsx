export default function BiatLogo({ size = 48, radius = 13 }: { size?: number; radius?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="biatDark" x1="10%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2F6B3A" />
          <stop offset="55%" stopColor="#16211B" />
          <stop offset="100%" stopColor="#0A160E" />
        </linearGradient>
        <linearGradient id="biatBright" x1="0%" y1="0%" x2="100%" y2="70%">
          <stop offset="0%" stopColor="#C7E896" />
          <stop offset="55%" stopColor="#8DC63F" />
          <stop offset="100%" stopColor="#4E9A3E" />
        </linearGradient>
        <clipPath id="biatRound">
          <rect width="200" height="200" rx={radius * (200 / size)} />
        </clipPath>
      </defs>
      <g clipPath="url(#biatRound)">
        <rect width="200" height="200" fill="url(#biatDark)" />
        <path d="M -10 78 C 55 24, 96 108, 214 46 L 214 -10 L -10 -10 Z" fill="url(#biatBright)" />
        <path
          d="M -10 78 C 55 24, 96 108, 214 46"
          stroke="#FFFFFF"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
