import React from 'react';
import { PlaceableId } from '../data/virginiaTrees';

interface BotanicalIconProps {
  id: PlaceableId;
  className?: string;
}

export const BotanicalIcon: React.FC<BotanicalIconProps> = ({
  id,
  className = 'w-7 h-7',
}) => {
  switch (id) {
    case 'dogwood':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 14C13.5 11.5 11.5 7 14 4.2L16 6L18 4.2C20.5 7 18.5 11.5 16 14Z"
            fill="#FAF4F0"
            stroke="#D6BDB4"
            strokeWidth="1"
          />
          <path
            d="M16 18C18.5 20.5 20.5 25 18 27.8L16 26L14 27.8C11.5 25 13.5 20.5 16 18Z"
            fill="#F3E5DE"
            stroke="#D6BDB4"
            strokeWidth="1"
          />
          <path
            d="M14 16C11.5 18.5 7 20.5 4.2 18L6 16L4.2 14C7 11.5 11.5 13.5 14 16Z"
            fill="#F7ECE7"
            stroke="#D6BDB4"
            strokeWidth="1"
          />
          <path
            d="M18 16C20.5 13.5 25 11.5 27.8 14L26 16L27.8 18C25 20.5 20.5 18.5 18 16Z"
            fill="#FAF4F0"
            stroke="#D6BDB4"
            strokeWidth="1"
          />
          <circle cx="16" cy="16" r="2.7" fill="#C9D66B" stroke="#7A8C38" strokeWidth="1" />
        </svg>
      );

    case 'redbud':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M17 25C17 25 7.5 19.5 7.5 12.2C7.5 8.5 10.6 6.2 13.6 7.4C15.2 8 16.3 9.4 17 10.6C17.7 9.4 18.8 8 20.4 7.4C23.4 6.2 26.5 8.5 26.5 12.2C26.5 19.5 17 25 17 25Z"
            fill="#E06D9F"
            stroke="#A8386D"
            strokeWidth="1.2"
          />
          <path d="M17 25V12.5" stroke="#FCE7F3" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="10.5" cy="21" r="2.6" fill="#F4A3C7" stroke="#A8386D" strokeWidth="1" />
          <circle cx="7.8" cy="18.2" r="2.1" fill="#FBCFE8" stroke="#A8386D" strokeWidth="0.9" />
          <path d="M17 25L15.5 28.5" stroke="#8A6C73" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'cherry':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          {[0, 72, 144, 216, 288].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 16 16)`}>
              <path
                d="M16 15.2C13.6 12.5 12.4 7.4 14.4 5.2L16 6.7L17.6 5.2C19.6 7.4 18.4 12.5 16 15.2Z"
                fill="#FDD5E0"
                stroke="#E598AE"
                strokeWidth="0.95"
              />
            </g>
          ))}
          <circle cx="16" cy="16" r="2.6" fill="#F4A6BE" />
          <circle cx="16" cy="16" r="1.2" fill="#FEF08A" />
        </svg>
      );

    case 'white-oak':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 4C18 4 19 6 18.4 7.8C20.2 6.8 22.8 7.6 22.6 9.8C22.4 11.4 20.6 12.2 19.6 13C22 12.4 25 13.8 24.4 16.4C23.9 18.4 21.4 18.8 19.6 19.2C21.2 19.8 22.6 21.6 21.2 23.2C19.8 24.6 17.8 23.4 16.8 22.8V26.5H15.2V22.8C14.2 23.4 12.2 24.6 10.8 23.2C9.4 21.6 10.8 19.8 12.4 19.2C10.6 18.8 8.1 18.4 7.6 16.4C7 13.8 10 12.4 12.4 13C11.4 12.2 9.6 11.4 9.4 9.8C9.2 7.6 11.8 6.8 13.6 7.8C13 6 14 4 16 4Z"
            fill="#D98A4E"
            stroke="#8C4B20"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M16 7.5V28" stroke="#FDE6C4" strokeWidth="1.2" strokeLinecap="round" />
          <path
            d="M16 14L20.5 10.5M16 18.5L21 15.8M16 14L11.5 10.5M16 18.5L11 15.8"
            stroke="#FDE6C4"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'red-maple':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 3.5L18.4 9.8L22.2 8.2L20.5 13.2L26.5 12.8L23.4 16.8L26.8 19.8L20.6 20.6L21.5 23.8L16.8 22.2V28H15.2V22.2L10.5 23.8L11.4 20.6L5.2 19.8L8.6 16.8L5.5 12.8L11.5 13.2L9.8 8.2L13.6 9.8L16 3.5Z"
            fill="#EA4C42"
            stroke="#991B1B"
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
          <path
            d="M16 8V22.5M16 17.5L22.5 14.5M16 17.5L9.5 14.5"
            stroke="#FECACA"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'pine':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 4L21.5 11.5H18.2L23.5 18.2H19.4L24.8 24.5H7.2L12.6 18.2H8.5L13.8 11.5H10.5L16 4Z"
            fill="#34A867"
            stroke="#14532D"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <rect x="14.5" y="24.5" width="3" height="4" rx="0.8" fill="#8C5A3C" />
          <path
            d="M16 7.5V22.5"
            stroke="#BBF7D0"
            strokeWidth="1"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
        </svg>
      );

    case 'azalea':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M6.5 23.5C5.2 21.5 5.8 18 8.2 16.8C8.4 13.4 11.5 11 14.8 11.8C16.8 9.8 20.6 10.6 21.8 13.5C24.8 13.8 26.8 16.8 26 19.8C26.6 21.4 25.6 23.5 23.8 24H8.2C7.4 24 6.9 23.8 6.5 23.5Z"
            fill="#65A30D"
            stroke="#365314"
            strokeWidth="1.2"
          />
          <path
            d="M10.5 17.5C11.5 14.8 14.5 13.6 17.2 14.6C19.5 13.4 22.2 15.2 22.2 17.8"
            stroke="#BEF264"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="13" cy="17.2" r="1.5" fill="#FBCFE8" />
          <circle cx="20.2" cy="18.6" r="1.4" fill="#FBCFE8" />
        </svg>
      );

    case 'fern':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 26C16 20 12 13 6 10M16 26C16 19 20 13 26 10M16 26V6"
            stroke="#22C55E"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M16 11L12.5 8.5M16 15L12 12.5M16 19L12.5 16.5M16 11L19.5 8.5M16 15L20 12.5M16 19L19.5 16.5"
            stroke="#86EFAC"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'wildflower':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path d="M11 26V14M16 26V10M21 26V15" stroke="#4D7C0F" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="16" cy="10" r="3.4" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.9" />
          <circle cx="16" cy="10" r="1.3" fill="#78350F" />
          <circle cx="10.5" cy="14.5" r="2.8" fill="#C084FC" stroke="#7E22CE" strokeWidth="0.9" />
          <circle cx="21.5" cy="15.5" r="2.8" fill="#FB7185" stroke="#BE123C" strokeWidth="0.9" />
        </svg>
      );

    case 'switchgrass':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 26C15 19 11 12 7 8M16 26C16 18 15 10 13 5M16 26C16.5 18 18 11 20 6M16 26C18 19 21 13 25 9"
            stroke="#A3E635"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="13" cy="5.5" r="1.5" fill="#FDE047" />
          <circle cx="20" cy="6.2" r="1.5" fill="#FDE047" />
          <circle cx="25" cy="9.2" r="1.3" fill="#FACC15" />
          <circle cx="7.5" cy="8.2" r="1.3" fill="#FACC15" />
        </svg>
      );

    case 'raised-bed':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="4.5" y="14" width="23" height="11" rx="1.5" fill="#9A5B36" stroke="#5A3219" strokeWidth="1.3" />
          <path d="M5 19.5H27" stroke="#6B3C1E" strokeWidth="1.2" />
          <rect x="6.5" y="12.5" width="19" height="3.2" rx="1" fill="#4B3423" />
          <circle cx="10.5" cy="11" r="2.6" fill="#4ADE80" stroke="#166534" strokeWidth="0.9" />
          <circle cx="16" cy="10.2" r="2.8" fill="#86EFAC" stroke="#166534" strokeWidth="0.9" />
          <circle cx="21.5" cy="11" r="2.6" fill="#4ADE80" stroke="#166534" strokeWidth="0.9" />
        </svg>
      );

    case 'pond':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <ellipse cx="16" cy="17.5" rx="11.5" ry="7.5" fill="#38BDF8" stroke="#78716C" strokeWidth="2.2" />
          <ellipse cx="14.5" cy="16.2" rx="7.5" ry="4" fill="#7DD3FC" fillOpacity="0.6" />
          <circle cx="12" cy="18.2" r="2.5" fill="#4ADE80" stroke="#15803D" strokeWidth="0.9" />
          <circle cx="20.2" cy="16.5" r="2.2" fill="#4ADE80" stroke="#15803D" strokeWidth="0.9" />
          <circle cx="12.4" cy="17.8" r="1.2" fill="#FBCFE8" />
        </svg>
      );

    case 'water-basin':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path d="M12.5 20H19.5L20.5 26H11.5L12.5 20Z" fill="#A8A29E" stroke="#57534E" strokeWidth="1.2" />
          <path d="M7 13.5C7 17.8 11 20.5 16 20.5C21 20.5 25 17.8 25 13.5H7Z" fill="#D6D3D1" stroke="#57534E" strokeWidth="1.2" />
          <ellipse cx="16" cy="13.5" rx="8.5" ry="2.6" fill="#38BDF8" stroke="#57534E" strokeWidth="1.1" />
          <circle cx="17.5" cy="13.3" r="1.4" fill="#FBCFE8" />
        </svg>
      );

    case 'stone':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M5.5 23.5L8.2 15.2L14.5 11.5L22.5 13.2L26.5 19.5L25 24.5H7.2L5.5 23.5Z"
            fill="#A8A29E"
            stroke="#57534E"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 15.4L14.5 12.6L20.8 13.8C19.2 15.5 16.4 16.2 13.5 15.8C11.8 15.6 10.4 16 9.5 15.4Z"
            fill="#65A30D"
          />
          <path
            d="M10 21.5L15 18.5L21 20.5"
            stroke="#D6D3D1"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'stepping-stone':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M7 19L10.5 12.5L21.5 11.5L25.5 17.5L21 23L9.5 22.5L7 19Z"
            fill="#CBD5E1"
            stroke="#64748B"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M11 16L18.5 15.2" stroke="#F8FAFC" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    case 'bench':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="6" y="10" width="20" height="5" rx="1" fill="#C07D4F" stroke="#6E4223" strokeWidth="1.2" />
          <rect x="5" y="16.5" width="22" height="3.8" rx="1" fill="#D99B66" stroke="#6E4223" strokeWidth="1.2" />
          <path d="M8.5 20.5V26M23.5 20.5V26M8.5 15V16.5M23.5 15V16.5" stroke="#6E4223" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );

    case 'pergola':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path d="M5 10H27M7 7.5H25" stroke="#8C5430" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M9 10V26M23 10V26" stroke="#A66A43" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="12" cy="11.5" r="2.2" fill="#4ADE80" />
          <circle cx="16" cy="12" r="2.4" fill="#C084FC" />
          <circle cx="20" cy="11.2" r="2.1" fill="#4ADE80" />
        </svg>
      );

    case 'stone-wall':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="5" y="13" width="9.5" height="5.5" rx="1" fill="#A8A29E" stroke="#57534E" strokeWidth="1.1" />
          <rect x="15.5" y="13" width="11.5" height="5.5" rx="1" fill="#94A3B8" stroke="#57534E" strokeWidth="1.1" />
          <rect x="5" y="19.5" width="12.5" height="5.5" rx="1" fill="#94A3B8" stroke="#57534E" strokeWidth="1.1" />
          <rect x="18.5" y="19.5" width="8.5" height="5.5" rx="1" fill="#A8A29E" stroke="#57534E" strokeWidth="1.1" />
          <path d="M9 12.5C11 11 14 11.2 15.5 12.5" stroke="#65A30D" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'fence':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="7" y="9" width="3.2" height="17" rx="0.8" fill="#A46B43" stroke="#5C361D" strokeWidth="1.1" />
          <rect x="21.8" y="9" width="3.2" height="17" rx="0.8" fill="#A46B43" stroke="#5C361D" strokeWidth="1.1" />
          <rect x="5" y="13" width="22" height="2.6" rx="0.6" fill="#C78A5B" stroke="#5C361D" strokeWidth="1" />
          <rect x="5" y="19" width="22" height="2.6" rx="0.6" fill="#C78A5B" stroke="#5C361D" strokeWidth="1" />
        </svg>
      );

    case 'pavilion':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path d="M5 14L16 6.5L27 14H5Z" fill="#BAE6FD" stroke="#5A3924" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M9 14V24M23 14V24" stroke="#8C5835" strokeWidth="2.1" strokeLinecap="round" />
          <rect x="6" y="23.5" width="20" height="3" rx="0.8" fill="#A66D45" stroke="#5A3924" strokeWidth="1.1" />
          <circle cx="16" cy="17.5" r="2.1" fill="#FDE047" />
        </svg>
      );

    case 'lantern':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M8.5 11.5L16 6L23.5 11.5H8.5Z"
            fill="#926243"
            stroke="#573826"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <rect
            x="11"
            y="11.5"
            width="10"
            height="8.5"
            rx="1"
            fill="#FEF08A"
            stroke="#784C32"
            strokeWidth="1.2"
          />
          <circle cx="16" cy="15.8" r="2.2" fill="#F59E0B" />
          <path
            d="M13.5 20H18.5L17.8 27H14.2L13.5 20Z"
            fill="#7C5036"
            stroke="#4D301F"
            strokeWidth="1.2"
          />
        </svg>
      );

    case 'bollard':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="11.5" y="8" width="9" height="3" rx="1" fill="#52525B" stroke="#27272A" strokeWidth="1" />
          <rect x="12.5" y="11" width="7" height="4.5" fill="#FDE047" stroke="#A16207" strokeWidth="1" />
          <rect x="12" y="15.5" width="8" height="11" rx="1" fill="#6B4C38" stroke="#3F2B1E" strokeWidth="1.1" />
        </svg>
      );

    case 'fire-pit':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <ellipse cx="16" cy="21" rx="10" ry="4.5" fill="#94A3B8" stroke="#475569" strokeWidth="1.4" />
          <ellipse cx="16" cy="20" rx="6.5" ry="2.6" fill="#451A03" />
          <path
            d="M16 9C17.8 12.2 20.5 14 20 17.5C19.6 19.6 18 20.8 16 20.8C14 20.8 12.4 19.6 12 17.5C11.5 14.5 14 12.5 16 9Z"
            fill="#F97316"
          />
          <path
            d="M16 13.5C17 15.2 18.2 16.5 17.8 18.4C17.5 19.5 16.8 20.2 16 20.2C15.2 20.2 14.5 19.5 14.2 18.4C13.8 16.5 15 15.2 16 13.5Z"
            fill="#FEF08A"
          />
        </svg>
      );

    case 'deck-tile':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="6" y="7" width="20" height="18" rx="1.8" fill="#C48A5A" stroke="#6E4223" strokeWidth="1.3" />
          <path d="M6 11.5H26M6 16H26M6 20.5H26" stroke="#7C4D2B" strokeWidth="1.2" />
          <path d="M13 7V11.5M20 11.5V16M11 16V20.5M18 20.5V25" stroke="#7C4D2B" strokeWidth="1" />
        </svg>
      );

    case 'upright-piano':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="6" y="6" width="20" height="19" fill="#5A3321" stroke="#2D180E" strokeWidth="1.3" />
          <rect x="7.5" y="14" width="17" height="4.5" fill="#F8F3E8" stroke="#2D180E" strokeWidth="1" />
          <path d="M10.5 14V16.8M13.5 14V16.8M17.5 14V16.8M20.5 14V16.8" stroke="#181210" strokeWidth="1.6" />
          <rect x="13" y="21.5" width="6" height="2" fill="#D9A84E" />
        </svg>
      );

    case 'concert-harp':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M10 26V7.5C13 6.2 17 8.5 23 11.5L13.5 26H10Z"
            fill="#E3BA5E"
            fillOpacity="0.22"
            stroke="#D9A648"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M13 8.5V24M16 9.5V21.5M19 10.8V18" stroke="#F8E2A6" strokeWidth="0.95" />
          <rect x="8.5" y="25" width="7.5" height="2.2" fill="#9A6828" />
        </svg>
      );

    case 'marimba':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path d="M7.5 15V25M24.5 15V25" stroke="#5A3722" strokeWidth="2" strokeLinecap="round" />
          <rect x="5.5" y="10" width="3.2" height="11" fill="#A6552B" stroke="#4D2411" strokeWidth="0.9" />
          <rect x="9.6" y="10.8" width="3.2" height="9.6" fill="#BA6436" stroke="#4D2411" strokeWidth="0.9" />
          <rect x="13.7" y="11.5" width="3.2" height="8.4" fill="#CE7743" stroke="#4D2411" strokeWidth="0.9" />
          <rect x="17.8" y="12.2" width="3.2" height="7.2" fill="#DC884F" stroke="#4D2411" strokeWidth="0.9" />
          <rect x="21.9" y="12.8" width="3.2" height="6" fill="#E89C62" stroke="#4D2411" strokeWidth="0.9" />
          <path d="M11 21V24.5M15.3 20.5V23.8M19.4 20V22.8" stroke="#C5CCD6" strokeWidth="1.3" />
        </svg>
      );

    case 'standing-cello':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 9.5C13 9.5 11.2 11.4 11.6 13.6C12 15.2 13 15.8 12.6 17C10.4 18.2 9.8 21.8 11.5 23.8C12.8 25.2 19.2 25.2 20.5 23.8C22.2 21.8 21.6 18.2 19.4 17C19 15.8 20 15.2 20.4 13.6C20.8 11.4 19 9.5 16 9.5Z"
            fill="#B85626"
            stroke="#59220C"
            strokeWidth="1.3"
          />
          <path d="M16 4V28.5" stroke="#2B150B" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M13.5 19.5H18.5" stroke="#F6DEC0" strokeWidth="1.1" />
        </svg>
      );

    case 'modular-synth':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="6" y="7" width="20" height="18" fill="#232B34" stroke="#8C5A34" strokeWidth="1.8" />
          <circle cx="10.5" cy="11.5" r="1.5" fill="#7DE0D2" />
          <circle cx="15.5" cy="11.5" r="1.5" fill="#F29463" />
          <circle cx="21" cy="11.5" r="1.5" fill="#E8E4D8" />
          <path d="M10.5 17C12.5 21 18.5 21 21 16.5" stroke="#F26A56" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M15.5 15.5C16.5 19 20.5 19.5 22 17" stroke="#5CE1D6" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    case 'tape-deck':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="6" y="7" width="20" height="18" fill="#4E4239" stroke="#241D18" strokeWidth="1.4" />
          <circle cx="11.5" cy="13" r="3.6" fill="#D5DBE2" stroke="#1E242B" strokeWidth="1.1" />
          <circle cx="20.5" cy="13" r="3.6" fill="#D5DBE2" stroke="#1E242B" strokeWidth="1.1" />
          <circle cx="11.5" cy="13" r="1.1" fill="#1E242B" />
          <circle cx="20.5" cy="13" r="1.1" fill="#1E242B" />
          <rect x="9" y="19.5" width="14" height="3.2" fill="#1F2429" stroke="#E0B66B" strokeWidth="0.9" />
        </svg>
      );

    case 'drum-stack':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <circle cx="16" cy="19.5" r="6.8" fill="#B84A39" stroke="#4D1A12" strokeWidth="1.3" />
          <circle cx="16" cy="19.5" r="4.8" fill="#EFE7D6" stroke="#7A2A1E" strokeWidth="0.9" />
          <ellipse cx="10" cy="10.5" rx="4.5" ry="1.4" fill="#E6C260" stroke="#85651A" strokeWidth="0.9" />
          <ellipse cx="22.5" cy="11.5" rx="4.5" ry="1.4" fill="#E6C260" stroke="#85651A" strokeWidth="0.9" />
          <path d="M10 12V25M22.5 13V25" stroke="#B6C0CC" strokeWidth="1.1" />
        </svg>
      );

    case 'wind-chime-arch':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path d="M7.5 26V10H24.5V26" stroke="#8B5A36" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M11 10.5V21M14.3 10.5V23.2M17.7 10.5V22M21 10.5V19.5" stroke="#DFC070" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="14.3" cy="23.5" r="1.1" fill="#F8E7A6" />
        </svg>
      );

    case 'singing-bowl':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="11" y="21" width="10" height="5" fill="#7D7A74" stroke="#3D3A36" strokeWidth="1.1" />
          <path d="M7.5 13.5C7.5 18.5 11 21.5 16 21.5C21 21.5 24.5 18.5 24.5 13.5H7.5Z" fill="#DFAA44" stroke="#7D5211" strokeWidth="1.3" />
          <ellipse cx="16" cy="13.5" rx="8.5" ry="2.2" fill="#F4D37B" stroke="#7D5211" strokeWidth="1.1" />
          <path d="M18.5 9L24.5 12" stroke="#5A331C" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'bronze-gong':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path d="M6.5 26V8.5H25.5V26" stroke="#5B3620" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="16" cy="17.5" r="6.4" fill="#D59A38" stroke="#6E440C" strokeWidth="1.3" />
          <circle cx="16" cy="17.5" r="2.2" fill="#F6D57E" stroke="#8A5714" strokeWidth="0.9" />
          <path d="M13 8.5V11.8M19 8.5V11.8" stroke="#E5B95C" strokeWidth="1.1" />
        </svg>
      );
  }
};
