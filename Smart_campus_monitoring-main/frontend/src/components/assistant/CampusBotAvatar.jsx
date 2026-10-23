import React from 'react';
import './CampusBotAvatar.css';

/**
 * Animated SVG Avatar for Smart Campus AI Assistant
 * 
 * Supports 3 dynamic states:
 * - 'idle': organic breathing float & intermittent blinking
 * - 'thinking': eyes glanced up, subtle head tilt, pulsating neural antenna ring
 * - 'responding': cheerful curved eyes, gentle mouth waveform speaking animation
 */
export default function CampusBotAvatar({ state = 'idle', size = 'md', className = '' }) {
  // size presets: 'sm' (32px), 'md' (44px), 'lg' (60px)
  const sizeMap = {
    sm: 32,
    md: 44,
    lg: 60
  };
  const px = sizeMap[size] || 44;

  return (
    <div
      className={`campus-avatar-wrapper avatar-${size} state-${state} ${className}`}
      style={{ width: `${px}px`, height: `${px}px` }}
      aria-label={`Campus Assistant avatar (${state} state)`}
      role="img"
    >
      <svg
        viewBox="0 0 64 64"
        width={px}
        height={px}
        className="campus-avatar-svg"
      >
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7A9474" />
            <stop offset="100%" stopColor="#55705B" />
          </linearGradient>
          <linearGradient id="faceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#202925" />
            <stop offset="100%" stopColor="#151C18" />
          </linearGradient>
          <linearGradient id="haloGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C77B45" />
            <stop offset="100%" stopColor="#7A9474" />
          </linearGradient>
        </defs>

        {/* Neural Antenna Halo (Active during 'thinking') */}
        <circle
          cx="32"
          cy="10"
          r="6"
          className="avatar-halo"
          fill="none"
          stroke="url(#haloGradient)"
          strokeWidth="2.5"
        />

        {/* Antenna Stem */}
        <line
          x1="32"
          y1="16"
          x2="32"
          y2="22"
          stroke="#55705B"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="32" cy="10" r="3" className="avatar-antenna-tip" fill="#7A9474" />

        {/* Outer Head Chassis */}
        <rect
          x="10"
          y="20"
          width="44"
          height="38"
          rx="12"
          fill="url(#bodyGradient)"
          className="avatar-chassis"
        />

        {/* Ear Sensor Pods */}
        <rect x="6" y="32" width="4" height="14" rx="2" fill="#55705B" />
        <rect x="54" y="32" width="4" height="14" rx="2" fill="#55705B" />

        {/* Inner Visor / Screen */}
        <rect
          x="15"
          y="26"
          width="34"
          height="26"
          rx="8"
          fill="url(#faceGradient)"
          className="avatar-visor"
        />

        {/* Eyes Group */}
        <g className="avatar-eyes">
          {state === 'responding' ? (
            /* Cheerful curved crescent eyes when speaking */
            <>
              <path
                d="M 22 36 Q 26 31 30 36"
                stroke="#A8D5A2"
                strokeWidth="2.8"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 34 36 Q 38 31 42 36"
                stroke="#A8D5A2"
                strokeWidth="2.8"
                fill="none"
                strokeLinecap="round"
              />
            </>
          ) : (
            /* Normal or thinking oval eyes */
            <>
              <ellipse
                cx={state === 'thinking' ? 26 : 25}
                cy={state === 'thinking' ? 34 : 36}
                rx="3.2"
                ry="3.8"
                fill={state === 'thinking' ? '#E5A97D' : '#8CE084'}
                className="eye left-eye"
              />
              <ellipse
                cx={state === 'thinking' ? 38 : 39}
                cy={state === 'thinking' ? 34 : 36}
                rx="3.2"
                ry="3.8"
                fill={state === 'thinking' ? '#E5A97D' : '#8CE084'}
                className="eye right-eye"
              />
            </>
          )}
        </g>

        {/* Mouth / Audio Waveform Indicator */}
        <g className="avatar-mouth">
          {state === 'responding' ? (
            /* Active Speaking Bars */
            <>
              <line x1="26" y1="44" x2="26" y2="48" stroke="#8CE084" strokeWidth="2" strokeLinecap="round" className="wave-bar bar-1" />
              <line x1="30" y1="43" x2="30" y2="49" stroke="#8CE084" strokeWidth="2" strokeLinecap="round" className="wave-bar bar-2" />
              <line x1="34" y1="43" x2="34" y2="49" stroke="#8CE084" strokeWidth="2" strokeLinecap="round" className="wave-bar bar-3" />
              <line x1="38" y1="44" x2="38" y2="48" stroke="#8CE084" strokeWidth="2" strokeLinecap="round" className="wave-bar bar-4" />
            </>
          ) : state === 'thinking' ? (
            /* Thinking Subtle Line */
            <circle cx="32" cy="46" r="1.8" fill="#E5A97D" className="thinking-dot" />
          ) : (
            /* Idle Gentle Smile */
            <path
              d="M 28 45 Q 32 48 36 45"
              stroke="#688B67"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </g>
      </svg>
    </div>
  );
}
