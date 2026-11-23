// Parameterized physics profiles for Paper Sky.
// All 4 profiles share the exact same card collision, slope slide, unfolding bridge,
// Dream-Sight phantom, and updraft solver in KinematicController.ts.

export type PhysicsProfileId = 'glide' | 'arcade' | 'moon' | 'skate';

export interface PhysicsProfile {
  id: PhysicsProfileId;
  code: string;
  label: string;
  shortLabel: string;
  accentHex: string;
  feelNote: string;
  gravityUp: number;
  gravityDown: number;
  glideGravity: number;
  diveGravity: number;
  terminalFall: number;
  glideSinkCap: number;
  canGlide: boolean;
  jumpImpulse: number;
  airJumpBase: number;
  airJumpDecay: number;
  maxJumps: number;
  moveSpeed: number;
  groundAccel: number;
  groundDrag: number;
  airAccel: number;
  airDrag: number;
  maxAirSpeed: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  slideAccel: number;
  slideMaxSpeed: number;
  updraftMult: number;
  landingDamp: number;
  bankScale: number;
}

export const PHYSICS_PROFILES: PhysicsProfile[] = [
  {
    id: 'glide',
    code: 'P1',
    label: 'Paper Glide',
    shortLabel: 'GLIDE',
    accentHex: '#7bb5dd',
    feelNote: 'Balanced 3-jump arc + dress hover-glide',
    gravityUp: 19.5,
    gravityDown: 15.5,
    glideGravity: 6.2,
    diveGravity: 27.0,
    terminalFall: -9.8,
    glideSinkCap: -2.05,
    canGlide: true,
    jumpImpulse: 10.8,
    airJumpBase: 9.6,
    airJumpDecay: 0.7,
    maxJumps: 3,
    moveSpeed: 9.8,
    groundAccel: 14.0,
    groundDrag: 14.0,
    airAccel: 21.0,
    airDrag: 0.44,
    maxAirSpeed: 13.8,
    dashSpeed: 20.5,
    dashDuration: 0.24,
    dashCooldown: 0.68,
    slideAccel: 18.0,
    slideMaxSpeed: 18.5,
    updraftMult: 1.0,
    landingDamp: 0.78,
    bankScale: 1.0,
  },
  {
    id: 'arcade',
    code: 'P2',
    label: '8-Bit Arcade',
    shortLabel: 'ARCADE',
    accentHex: '#8bac0f',
    feelNote: 'Snappy 1.38× gravity, crisp 2-jump, instant stop',
    gravityUp: 26.8,
    gravityDown: 23.0,
    glideGravity: 23.0,
    diveGravity: 32.0,
    terminalFall: -14.5,
    glideSinkCap: -13.5,
    canGlide: false,
    jumpImpulse: 13.0,
    airJumpBase: 11.4,
    airJumpDecay: 0.5,
    maxJumps: 2,
    moveSpeed: 11.0,
    groundAccel: 28.0,
    groundDrag: 30.0,
    airAccel: 26.0,
    airDrag: 0.28,
    maxAirSpeed: 13.6,
    dashSpeed: 24.0,
    dashDuration: 0.16,
    dashCooldown: 0.46,
    slideAccel: 20.0,
    slideMaxSpeed: 19.5,
    updraftMult: 1.12,
    landingDamp: 0.85,
    bankScale: 0.72,
  },
  {
    id: 'moon',
    code: 'P3',
    label: 'Moon Drift',
    shortLabel: 'MOON',
    accentHex: '#c4b0ff',
    feelNote: 'Low-G 0.52× hangtime, 4 air hops, tall updrafts',
    gravityUp: 10.2,
    gravityDown: 8.0,
    glideGravity: 3.4,
    diveGravity: 19.0,
    terminalFall: -5.8,
    glideSinkCap: -1.15,
    canGlide: true,
    jumpImpulse: 8.9,
    airJumpBase: 8.2,
    airJumpDecay: 0.45,
    maxJumps: 4,
    moveSpeed: 8.8,
    groundAccel: 9.4,
    groundDrag: 8.6,
    airAccel: 16.8,
    airDrag: 0.58,
    maxAirSpeed: 13.4,
    dashSpeed: 17.8,
    dashDuration: 0.30,
    dashCooldown: 0.62,
    slideAccel: 13.5,
    slideMaxSpeed: 16.0,
    updraftMult: 1.28,
    landingDamp: 0.88,
    bankScale: 1.25,
  },
  {
    id: 'skate',
    code: 'P4',
    label: 'Card Skate',
    shortLabel: 'SKATE',
    accentHex: '#f26a56',
    feelNote: 'Carving momentum, fast slides & hop speed carry',
    gravityUp: 18.8,
    gravityDown: 16.2,
    glideGravity: 8.4,
    diveGravity: 27.5,
    terminalFall: -11.4,
    glideSinkCap: -3.1,
    canGlide: true,
    jumpImpulse: 11.2,
    airJumpBase: 9.8,
    airJumpDecay: 0.65,
    maxJumps: 3,
    moveSpeed: 13.4,
    groundAccel: 6.4,
    groundDrag: 2.3,
    airAccel: 15.5,
    airDrag: 0.74,
    maxAirSpeed: 18.2,
    dashSpeed: 23.0,
    dashDuration: 0.22,
    dashCooldown: 0.54,
    slideAccel: 25.5,
    slideMaxSpeed: 23.5,
    updraftMult: 1.05,
    landingDamp: 0.96,
    bankScale: 1.55,
  },
];

export function getPhysicsProfile(id: PhysicsProfileId): PhysicsProfile {
  return PHYSICS_PROFILES.find((p) => p.id === id) ?? PHYSICS_PROFILES[0];
}
