// KinematicController & ContactShadowProjector:
// - Triple-jump air chain + Hold-Space floating dress/cape hover-glide
// - Butterfly-paper air dash (F / right-click / Dash orb)
// - Sloped card surface collision & automatic downhill slide ramps
// - Domino-unfolding crimson card bridges + Dream-Sight (Q) phantom cards
// - Vertical Updraft wind columns + Walkable House-of-Cards Castle wall collisions
// - Shift flying-squirrel dive tuck + flare lift + cloud-break descent into Virginia Sylva

import {
  CardChoreographySettings,
  DEFAULT_CARD_CHOREOGRAPHY,
  UpdraftZone,
  WorldCardRecord,
} from './InstancedWorldBuilder';
import { PHYSICS_PROFILES, PhysicsProfile } from './physicsProfiles';

export const COYOTE_TIME = 0.14;
export const JUMP_BUFFER_TIME = 0.12;
export const MAX_JUMPS = 3;
export const CLOUD_BREAK_Y = -5.2;

export interface ContactShadowState {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  rotY: number;
  slopeX: number;
  radius: number;
  opacity: number;
}

export interface PlayerInputState {
  forward: number; // -1..1
  strafe: number; // -1..1
  jumpPressed: boolean; // edge-triggered tap
  jumpHeld: boolean; // hold Space for Alice dress/cape hover-glide!
  dashPressed: boolean; // F / right-click butterfly-paper dash!
  diveHeld: boolean; // Shift dive tuck
  dreamSightActive: boolean; // Q Dream Sight toggle
}

export interface PaperGirlState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  bankRoll: number;
  bodyPitch: number;
  onGround: boolean;
  isSliding: boolean;
  inUpdraft: boolean;
  groundedCardId: number | null;
  coyoteTimer: number;
  jumpBufferTimer: number;
  jumpsUsed: number; // 0..3
  dashTimer: number; // >0 while dashing
  dashCooldown: number;
  dashDirX: number;
  dashDirZ: number;
  glideSpread: number; // 0..1 dress/glider flare
  diveEnergy: number;
  wasDiving: boolean;
  dreamSight: number; // 0..1 smooth blend
  runCycle: number;
  checkpointCardId: number;
  cardsVisited: number;
  totalWalkable: number;
  descending: boolean;
  descentProgress: number;
  descentNotified: boolean;
}

export interface ControllerCallbacks {
  onCardLand?: (card: WorldCardRecord, isNewCard: boolean, isCheckpoint: boolean) => void;
  onJump?: (jumpNumber: number, x: number, y: number, z: number) => void;
  onDash?: (x: number, y: number, z: number, dirX: number, dirZ: number) => void;
  onCardUnfold?: (card: WorldCardRecord) => void;
  onUpdraft?: () => void;
  onDescentStart?: () => void;
  onDescentComplete?: () => void;
}

export function createInitialPlayerState(cards: WorldCardRecord[]): PaperGirlState {
  const start = cards[0];
  const totalWalkable = cards.filter((c) => c.isWalkable && c.kind !== 'catch').length;
  const spawnZ = start
    ? start.scaleZ > 16
      ? start.baseZ - start.scaleZ * 0.28
      : start.baseZ + 1.8
    : 1.8;
  return {
    x: start ? start.baseX : 0,
    y: start ? start.baseY + start.scaleY * 0.5 + 0.02 : 2.2,
    z: spawnZ,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    bankRoll: 0,
    bodyPitch: 0,
    onGround: true,
    isSliding: false,
    inUpdraft: false,
    groundedCardId: start ? start.id : null,
    coyoteTimer: COYOTE_TIME,
    jumpBufferTimer: 0,
    jumpsUsed: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirZ: -1,
    glideSpread: 0,
    diveEnergy: 0,
    wasDiving: false,
    dreamSight: 0,
    runCycle: 0,
    checkpointCardId: start ? start.id : 0,
    cardsVisited: 1,
    totalWalkable,
    descending: false,
    descentProgress: 0,
    descentNotified: false,
  };
}

/**
 * Computes exact top surface Y of a (possibly sloped) card at local coordinates (lx, lz).
 */
export function getCardSurfaceY(card: WorldCardRecord, lz: number): number {
  const cosX = Math.max(0.25, Math.cos(card.rotX));
  return card.curY + (card.scaleY * 0.5) / cosX - lz * Math.tan(card.rotX);
}

/**
 * Returns whether a walkable card is currently solid (always true for normal cards,
 * true for unfolding cards once flipped > 45%, true for phantom cards when revealed via Dream Sight).
 */
export function isCardCurrentlySolid(card: WorldCardRecord): boolean {
  if (!card.isWalkable) return false;
  if (card.kind === 'catch') {
    return (
      (card.catchState === 'peeling' && card.catchProgress > 0.45) ||
      card.catchState === 'holding'
    );
  }
  if (card.isUnfolding) return card.revealProgress > 0.42;
  if (card.isHidden) return card.revealProgress > 0.45 || card.solidTimer > 0.05;
  return true;
}

function easeOutCubic(t: number): number {
  const inv = 1 - Math.max(0, Math.min(1, t));
  return 1 - inv * inv * inv;
}

function easeInQuad(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c;
}

/**
 * Steps deterministic sine-wave kinematics, visual spring-damper dip/tilt,
 * proximity wake & banking, domino-unfolding bridge cards, Dream-Sight phantom cards,
 * and the trajectory-predictive angelic catch-card pool.
 */
export function stepKinematicPlatforms(
  cards: WorldCardRecord[],
  player: PaperGirlState,
  dreamSightActive: boolean,
  time: number,
  dt: number,
  callbacks: ControllerCallbacks,
  choreography: CardChoreographySettings = DEFAULT_CARD_CHOREOGRAPHY,
  diveHeld = false,
) {
  const kDip = 48.0;
  const cDip = 7.4;
  const kTilt = 42.0;
  const cTilt = 6.8;
  const wakeAmt = Math.max(0, Math.min(1, choreography.proximityWake));
  const suppressCatch = diveHeld || player.descending || !choreography.catchCardsEnabled;

  // 1. Update permanent cards + existing active catch cards
  let activeCatchNearPrediction = false;
  const predTime = player.vy < -1.0 ? 0.36 : 0.5;
  const predX = player.x + player.vx * predTime;
  const predZ = player.z + player.vz * predTime;
  const predY = Math.max(
    CLOUD_BREAK_Y + 2.4,
    player.y + Math.min(0, player.vy) * 0.22 - 0.58,
  );

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    card.prevY = card.curY;

    if (card.kind === 'catch') {
      if (card.catchState === 'orbit') {
        card.curY = -90;
        card.revealProgress = 0;
        card.wakeGlow = 0;
        card.wakeLift = 0;
        continue;
      }

      // Immediately release peeling cards if player initiates Dive or Cloud-Break Descent
      if (suppressCatch && card.catchState === 'peeling') {
        card.catchState = 'returning';
        card.catchProgress = 0;
        card.catchStartX = card.baseX;
        card.catchStartY = card.curY;
        card.catchStartZ = card.baseZ;
      }

      if (card.catchState === 'peeling') {
        card.catchProgress = Math.min(1, card.catchProgress + dt * 2.55);
        const e = easeOutCubic(card.catchProgress);
        const arc = Math.sin(card.catchProgress * Math.PI) * 1.45;
        card.baseX = card.catchStartX + (card.catchTargetX - card.catchStartX) * e;
        card.baseZ = card.catchStartZ + (card.catchTargetZ - card.catchStartZ) * e;
        card.baseY = card.catchStartY + (card.catchTargetY - card.catchStartY) * e - arc * 0.22;
        card.curY = card.baseY + card.waveAmp * Math.sin(card.waveFreq * time + card.wavePhase);
        card.revealProgress = e;
        card.wakeGlow = 0.65 + (1 - e) * 0.35;
        if (card.catchProgress >= 1) {
          card.catchState = 'holding';
          card.catchHoldTimer = 3.2;
          card.dipVel -= 1.25;
        }
      } else if (card.catchState === 'holding') {
        card.baseX = card.catchTargetX;
        card.baseY = card.catchTargetY;
        card.baseZ = card.catchTargetZ;
        card.curY = card.baseY + card.waveAmp * Math.sin(card.waveFreq * time + card.wavePhase);
        card.revealProgress = 1.0;

        const isStandingOn = player.onGround && player.groundedCardId === card.id;
        const distPlayer = Math.hypot(player.x - card.baseX, player.z - card.baseZ);
        if (isStandingOn && !suppressCatch) {
          card.catchHoldTimer = 2.8;
          card.wakeGlow += (0.88 - card.wakeGlow) * Math.min(1, dt * 6.0);
        } else if (distPlayer < 5.5 && !suppressCatch && Math.abs(player.y - card.curY) < 4.5) {
          card.catchHoldTimer = Math.max(card.catchHoldTimer, 1.4);
          card.wakeGlow += (0.72 - card.wakeGlow) * Math.min(1, dt * 6.0);
        } else {
          card.catchHoldTimer -= dt * (suppressCatch ? 3.2 : 1.0);
          card.wakeGlow += (0.35 - card.wakeGlow) * Math.min(1, dt * 5.0);
          if (card.catchHoldTimer <= 0) {
            card.catchState = 'returning';
            card.catchProgress = 0;
            card.catchStartX = card.baseX;
            card.catchStartY = card.curY;
            card.catchStartZ = card.baseZ;
            const side = (card.id % 2 === 0 ? 1 : -1) * (10.5 + (card.id % 4) * 1.8);
            card.catchTargetX = card.baseX + side;
            card.catchTargetY = card.curY + 7.5 + (card.id % 3) * 1.6;
            card.catchTargetZ = card.baseZ - 6.5;
          }
        }
      } else if (card.catchState === 'returning') {
        card.catchProgress = Math.min(1, card.catchProgress + dt * 1.45);
        const e = easeInQuad(card.catchProgress);
        card.baseX = card.catchStartX + (card.catchTargetX - card.catchStartX) * e;
        card.baseY = card.catchStartY + (card.catchTargetY - card.catchStartY) * e;
        card.baseZ = card.catchStartZ + (card.catchTargetZ - card.catchStartZ) * e;
        card.curY = card.baseY;
        card.revealProgress = 1 - e;
        card.wakeGlow = (1 - e) * 0.45;
        if (card.catchProgress >= 1) {
          card.catchState = 'orbit';
          card.catchProgress = 0;
          card.revealProgress = 0;
          card.curY = -90;
          card.dipY = 0;
          card.dipVel = 0;
        }
      }

      // Spring-damper dip & tilt for catch cards
      const aDip = -kDip * card.dipY - cDip * card.dipVel;
      card.dipVel += aDip * dt;
      card.dipY += card.dipVel * dt;
      const aTX = -kTilt * card.tiltX - cTilt * card.tiltVelX;
      card.tiltVelX += aTX * dt;
      card.tiltX += card.tiltVelX * dt;
      const aTZ = -kTilt * card.tiltZ - cTilt * card.tiltVelZ;
      card.tiltVelZ += aTZ * dt;
      card.tiltZ += card.tiltVelZ * dt;

      if (card.catchState === 'peeling' || card.catchState === 'holding') {
        const dPred = Math.hypot(predX - card.catchTargetX, predZ - card.catchTargetZ);
        if (dPred < 5.6 && Math.abs(predY - card.catchTargetY) < 4.2) {
          activeCatchNearPrediction = true;
        }
      }
      continue;
    }

    card.curY = card.baseY + card.waveAmp * Math.sin(card.waveFreq * time + card.wavePhase);

    if (card.isWalkable) {
      const aDip = -kDip * card.dipY - cDip * card.dipVel;
      card.dipVel += aDip * dt;
      card.dipY += card.dipVel * dt;

      const aTX = -kTilt * card.tiltX - cTilt * card.tiltVelX;
      card.tiltVelX += aTX * dt;
      card.tiltX += card.tiltVelX * dt;

      const aTZ = -kTilt * card.tiltZ - cTilt * card.tiltVelZ;
      card.tiltVelZ += aTZ * dt;
      card.tiltZ += card.tiltVelZ * dt;

      // Angelic Proximity Wake: nearby walkable cards rise slightly, bank gently, and emit an approach halo
      if (wakeAmt > 0.01 && !card.isSlide && card.kind !== 'castle-floor') {
        const dist = Math.hypot(player.x - card.baseX, player.z - card.baseZ);
        const vertGap = Math.abs(player.y - card.curY);
        const prox =
          dist < 18.0 && vertGap < 11.0
            ? Math.pow(Math.max(0, 1.0 - dist / 18.0), 1.65) * wakeAmt
            : 0.0;
        const targetLift = prox * (card.scaleZ > 16 ? 0.1 : 0.36);
        const targetGlow = prox * 0.42;
        card.wakeLift += (targetLift - card.wakeLift) * Math.min(1, dt * 5.2);
        card.wakeGlow += (targetGlow - card.wakeGlow) * Math.min(1, dt * 5.8);

        if (prox > 0.14 && player.groundedCardId !== card.id) {
          const toCardX = (card.baseX - player.x) / Math.max(1.0, dist);
          const toCardZ = (card.baseZ - player.z) / Math.max(1.0, dist);
          const bankStrength = prox * 0.065;
          card.tiltX += (toCardZ * bankStrength - card.tiltX) * Math.min(1, dt * 2.4);
          card.tiltZ += (-toCardX * bankStrength - card.tiltZ) * Math.min(1, dt * 2.4);
        }
      } else {
        card.wakeLift += (0 - card.wakeLift) * Math.min(1, dt * 4.5);
        card.wakeGlow += (0 - card.wakeGlow) * Math.min(1, dt * 4.5);
      }
    }

    // Domino-unfolding crimson bridge cards snap flat as the player approaches!
    if (card.isUnfolding) {
      const distXZ = Math.hypot(player.x - card.baseX, player.z - card.baseZ);
      const shouldOpen = distXZ < 17.5 || card.visited;
      const target = shouldOpen ? 1.0 : 0.0;
      const speed = shouldOpen ? 4.4 : 1.5;
      const prevProg = card.revealProgress;
      card.revealProgress += (target - card.revealProgress) * Math.min(1, dt * speed);
      if (shouldOpen && prevProg < 0.35 && card.revealProgress >= 0.35 && !card.unfoldChimePlayed) {
        card.unfoldChimePlayed = true;
        card.dipVel -= 1.8; // tactile paper flip bounce!
        callbacks.onCardUnfold?.(card);
      }
      if (!shouldOpen && card.revealProgress < 0.1) {
        card.unfoldChimePlayed = false;
      }
    }

    // Dream-Sight phantom cards materialize solid when Dream Sight (Q) is active!
    if (card.isHidden) {
      if (dreamSightActive) {
        card.solidTimer = 5.5; // stay solid for 5.5s even if user toggles Dream Sight off!
      } else if (card.solidTimer > 0) {
        card.solidTimer = Math.max(0, card.solidTimer - dt);
      }
      const target = dreamSightActive || card.solidTimer > 0 ? 1.0 : 0.0;
      const prevProg = card.revealProgress;
      card.revealProgress += (target - card.revealProgress) * Math.min(1, dt * 6.0);
      if (prevProg < 0.45 && card.revealProgress >= 0.45) {
        callbacks.onCardUnfold?.(card);
      }
    }
  }

  // 2. Trajectory-Predictive Angelic Catch-Card Dispatch over open sky
  const shouldConsiderCatch =
    !suppressCatch &&
    !player.onGround &&
    !player.inUpdraft &&
    player.vy < 1.8 &&
    player.y > CLOUD_BREAK_Y + 1.5 &&
    !activeCatchNearPrediction;

  if (shouldConsiderCatch) {
    // Check whether any solid permanent card already covers the predicted landing spot
    let hasPermanentSupport = false;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (c.kind === 'catch' || !isCardCurrentlySolid(c)) continue;
      const dx = predX - c.baseX;
      const dz = predZ - c.baseZ;
      const cosR = Math.cos(-c.rotY);
      const sinR = Math.sin(-c.rotY);
      const lx = dx * cosR - dz * sinR;
      const lz = dx * sinR + dz * cosR;
      const halfW = c.scaleX * 0.5 + 1.85;
      const halfL = c.scaleZ * 0.5 * Math.max(0.35, Math.cos(c.rotX)) + 1.85;
      if (Math.abs(lx) <= halfW && Math.abs(lz) <= halfL) {
        const surfY = getCardSurfaceY(c, lz);
        if (player.y >= surfY - 2.2 && player.y - surfY < 10.5) {
          hasPermanentSupport = true;
          break;
        }
      }
    }

    if (!hasPermanentSupport) {
      // Find a free pooled catch card (prefer 'orbit', fall back to oldest 'returning')
      let chosen: WorldCardRecord | null = null;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        if (c.kind === 'catch' && c.catchState === 'orbit') {
          chosen = c;
          break;
        }
      }
      if (chosen) {
        const sideSign = (chosen.id % 2 === 0 ? 1 : -1);
        const hSpeed = Math.hypot(player.vx, player.vz);
        const headingYaw = hSpeed > 0.8 ? Math.atan2(-player.vx, -player.vz) : player.yaw;
        const rightX = Math.cos(headingYaw);
        const rightZ = -Math.sin(headingYaw);
        const fwdX = -Math.sin(headingYaw);
        const fwdZ = -Math.cos(headingYaw);

        chosen.catchState = 'peeling';
        chosen.catchProgress = 0;
        chosen.catchHoldTimer = 3.2;
        chosen.catchTargetX = predX;
        chosen.catchTargetY = predY;
        chosen.catchTargetZ = predZ;
        chosen.catchStartX = predX + rightX * sideSign * 11.5 + fwdX * 4.5;
        chosen.catchStartY = predY + 6.2 + (chosen.id % 3) * 1.4;
        chosen.catchStartZ = predZ + rightZ * sideSign * 11.5 + fwdZ * 4.5;
        chosen.baseX = chosen.catchStartX;
        chosen.baseY = chosen.catchStartY;
        chosen.baseZ = chosen.catchStartZ;
        chosen.curY = chosen.catchStartY;
        chosen.rotY = headingYaw;
        chosen.catchSpinY = sideSign * 1.45;
        chosen.dipY = 0;
        chosen.dipVel = 0;
        chosen.tiltX = 0;
        chosen.tiltZ = 0;
        chosen.revealProgress = 0.02;
        callbacks.onCardUnfold?.(chosen);
      }
    }
  }
}

/**
 * Downward raycast from player's XZ position to project a slope-aligned ink-wash contact shadow
 * directly onto the nearest solid walkable card below.
 */
export function computeContactShadow(
  player: PaperGirlState,
  cards: WorldCardRecord[],
): ContactShadowState {
  let bestCard: WorldCardRecord | null = null;
  let bestTopY = -Infinity;
  let bestHeightDelta = Infinity;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!isCardCurrentlySolid(c)) continue;
    const dx = player.x - c.baseX;
    const dz = player.z - c.baseZ;
    const cosR = Math.cos(-c.rotY);
    const sinR = Math.sin(-c.rotY);
    const lx = dx * cosR - dz * sinR;
    const lz = dx * sinR + dz * cosR;

    const halfW = c.scaleX * 0.5;
    const halfL = c.scaleZ * 0.5 * Math.max(0.3, Math.cos(c.rotX));
    if (Math.abs(lx) <= halfW && Math.abs(lz) <= halfL) {
      const topY = getCardSurfaceY(c, lz) + c.dipY;
      const delta = player.y - topY;
      if (delta >= -0.4 && delta < bestHeightDelta) {
        bestHeightDelta = Math.max(0, delta);
        bestTopY = topY;
        bestCard = c;
      }
    }
  }

  if (!bestCard || bestHeightDelta > 16.0) {
    return {
      visible: false,
      x: player.x,
      y: player.y,
      z: player.z,
      rotY: 0,
      slopeX: 0,
      radius: 0,
      opacity: 0,
    };
  }

  const normH = Math.min(1, bestHeightDelta / 13.0);
  const radius = 0.62 + normH * 0.95;
  const opacity = (1.0 - normH) * (1.0 - normH) * 0.52;

  return {
    visible: true,
    x: player.x,
    y: bestTopY + 0.035,
    z: player.z,
    rotY: bestCard.rotY,
    slopeX: bestCard.rotX,
    radius,
    opacity,
  };
}

export function resetPlayerToCheckpoint(
  player: PaperGirlState,
  cards: WorldCardRecord[],
) {
  const cp =
    cards.find((c) => c.id === player.checkpointCardId) ??
    cards.find((c) => c.isWalkable) ??
    cards[0];
  if (!cp) return;
  player.x = cp.baseX;
  player.y = cp.curY + cp.scaleY * 0.5 + 0.14;
  player.z =
    cp.scaleZ > 16
      ? cp.baseZ - cp.scaleZ * 0.28
      : cp.baseZ + Math.min(1.4, cp.scaleZ * 0.22);
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.bankRoll = 0;
  player.bodyPitch = 0;
  player.onGround = true;
  player.isSliding = false;
  player.inUpdraft = false;
  player.groundedCardId = cp.id;
  player.coyoteTimer = COYOTE_TIME;
  player.jumpBufferTimer = 0;
  player.jumpsUsed = 0;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.diveEnergy = 0;
  player.wasDiving = false;
  player.descending = false;
  player.descentProgress = 0;
  player.descentNotified = false;
}

export function triggerIntentionalDescent(
  player: PaperGirlState,
  callbacks: ControllerCallbacks,
) {
  if (player.descending) return;
  player.descending = true;
  player.onGround = false;
  player.isSliding = false;
  player.groundedCardId = null;
  player.vy = Math.min(player.vy, -9.5);
  player.glideSpread = 1.0;
  callbacks.onDescentStart?.();
}

/**
 * Full Alice-inspired third-person platformer & flying-squirrel glider controller.
 */
export function stepForgivingController(
  player: PaperGirlState,
  cards: WorldCardRecord[],
  updrafts: UpdraftZone[],
  input: PlayerInputState,
  cameraYaw: number,
  dt: number,
  callbacks: ControllerCallbacks,
  profile: PhysicsProfile = PHYSICS_PROFILES[0],
) {
  // Smooth Dream Sight blend
  const dreamTarget = input.dreamSightActive ? 1.0 : 0.0;
  player.dreamSight += (dreamTarget - player.dreamSight) * Math.min(1, dt * 7.0);

  // Cloud-break descent animation into Virginia Sylva
  if (player.descending) {
    player.descentProgress = Math.min(1, player.descentProgress + dt * 0.62);
    player.vy = Math.max(-22, player.vy - 12 * dt);
    player.y += player.vy * dt;
    player.x += player.vx * 0.45 * dt;
    player.z += player.vz * 0.45 * dt;
    player.glideSpread += (1.0 - player.glideSpread) * Math.min(1, dt * 6);
    player.bodyPitch += (0.82 - player.bodyPitch) * Math.min(1, dt * 4.5);
    player.bankRoll += (input.strafe * 0.4 - player.bankRoll) * Math.min(1, dt * 5);

    if (player.descentProgress >= 1 && !player.descentNotified) {
      player.descentNotified = true;
      callbacks.onDescentComplete?.();
    }
    return;
  }

  // 1. Velocity inheritance from moving platform
  if (player.onGround && player.groundedCardId !== null) {
    const plat = cards.find((c) => c.id === player.groundedCardId);
    if (plat) {
      player.y += plat.curY - plat.prevY;
    }
  }

  // 2. Timers (coyote, jump buffer, dash cooldown)
  if (player.onGround) {
    player.coyoteTimer = COYOTE_TIME;
    player.jumpsUsed = 0;
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  }

  if (input.jumpPressed) {
    player.jumpBufferTimer = JUMP_BUFFER_TIME;
  } else {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  }

  if (player.dashCooldown > 0) {
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  }

  // 3. Camera-relative movement direction
  const fwdX = -Math.sin(cameraYaw);
  const fwdZ = -Math.cos(cameraYaw);
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);

  let wishX = fwdX * input.forward + rightX * input.strafe;
  let wishZ = fwdZ * input.forward + rightZ * input.strafe;
  const wishLen = Math.hypot(wishX, wishZ);
  if (wishLen > 0.001) {
    wishX /= wishLen;
    wishZ /= wishLen;
  }

  if (wishLen > 0.08 && player.dashTimer <= 0) {
    const targetYaw = Math.atan2(-wishX, -wishZ);
    let diff = targetYaw - player.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    player.yaw += diff * Math.min(1, dt * (player.onGround ? 13.0 : 8.0));
  }

  // 4. Butterfly-Paper Air Dash (F / Right-Click / Dash Orb)
  if (input.dashPressed && player.dashCooldown <= 0) {
    const dx = wishLen > 0.1 ? wishX : -Math.sin(player.yaw);
    const dz = wishLen > 0.1 ? wishZ : -Math.cos(player.yaw);
    player.dashDirX = dx;
    player.dashDirZ = dz;
    player.dashTimer = profile.dashDuration;
    player.dashCooldown = profile.dashCooldown;
    player.vx = dx * profile.dashSpeed;
    player.vz = dz * profile.dashSpeed;
    player.vy = Math.max(player.vy * 0.2, 1.2);
    player.onGround = false;
    player.isSliding = false;
    player.groundedCardId = null;
    player.coyoteTimer = 0;
    callbacks.onDash?.(player.x, player.y + 0.8, player.z, dx, dz);
  }

  // 5. Multi-Jump Execution (Jump 1 on ground/coyote, air jumps up to profile.maxJumps)
  if (player.jumpBufferTimer > 0 && player.dashTimer <= 0) {
    if (player.coyoteTimer > 0) {
      // Primary ground launch
      player.vy = profile.jumpImpulse;
      player.onGround = false;
      player.isSliding = false;
      player.groundedCardId = null;
      player.coyoteTimer = 0;
      player.jumpBufferTimer = 0;
      player.jumpsUsed = 1;
      if (wishLen > 0.1) {
        const launchBoost = profile.id === 'skate' ? 3.2 : 2.2;
        player.vx += wishX * launchBoost;
        player.vz += wishZ * launchBoost;
      }
      callbacks.onJump?.(1, player.x, player.y + 0.1, player.z);
    } else if (player.jumpsUsed < profile.maxJumps) {
      // Mid-air hop chain (2..maxJumps)
      const nextJump = Math.max(2, player.jumpsUsed + 1);
      player.jumpsUsed = nextJump;
      player.vy = Math.max(
        6.8,
        profile.airJumpBase - (nextJump - 2) * profile.airJumpDecay,
      );
      player.jumpBufferTimer = 0;
      player.wasDiving = false;
      if (wishLen > 0.1) {
        const carry = profile.id === 'skate' ? 0.78 : profile.id === 'arcade' ? 0.35 : 0.55;
        const kick = profile.id === 'arcade' ? 8.2 : 6.8;
        player.vx = player.vx * carry + wishX * kick;
        player.vz = player.vz * carry + wishZ * kick;
      }
      callbacks.onJump?.(nextJump, player.x, player.y + 0.1, player.z);
    }
  }

  // 6. Active Dash / Ground Run / Slide / Airborne Hover-Glide & Dive Physics
  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    const activeDashSpd = profile.dashSpeed * 0.95;
    player.vx = player.dashDirX * activeDashSpd;
    player.vz = player.dashDirZ * activeDashSpd;
    player.vy = 0.6;
    player.glideSpread += (0.85 - player.glideSpread) * Math.min(1, dt * 14);
    player.bodyPitch += (0.45 - player.bodyPitch) * Math.min(1, dt * 12);
    if (player.dashTimer <= 0) {
      const exitScale = profile.id === 'skate' ? 0.84 : 0.62;
      player.vx *= exitScale;
      player.vz *= exitScale;
    }
  } else if (player.onGround) {
    if (player.isSliding) {
      // Exhilarating downhill card slide!
      const slideAccelZ = -profile.slideAccel; // slides straight down -Z ramp
      player.vz += slideAccelZ * dt;
      player.vz = Math.max(-profile.slideMaxSpeed, Math.min(-7.5, player.vz));
      // Allow crisp lateral steering while sliding down the card
      const targetSlideVx = wishX * (profile.id === 'skate' ? 9.6 : 7.2);
      player.vx += (targetSlideVx - player.vx) * Math.min(1, dt * 8.0);
      player.bodyPitch += (-0.34 - player.bodyPitch) * Math.min(1, dt * 10);
      player.glideSpread += (0.45 - player.glideSpread) * Math.min(1, dt * 8);
      player.bankRoll += (-input.strafe * 0.35 * profile.bankScale - player.bankRoll) * Math.min(1, dt * 9);
    } else {
      const runSpeed = profile.moveSpeed;
      const targetVx = wishX * runSpeed;
      const targetVz = wishZ * runSpeed;
      const rate = wishLen > 0.05 ? profile.groundAccel : profile.groundDrag;
      const accel = Math.min(1, dt * rate);
      player.vx += (targetVx - player.vx) * accel;
      player.vz += (targetVz - player.vz) * accel;
      player.glideSpread += (0.0 - player.glideSpread) * Math.min(1, dt * 11);
      player.bodyPitch += (wishLen * 0.16 - player.bodyPitch) * Math.min(1, dt * 11);
      const groundBank = profile.id === 'skate' ? -input.strafe * 0.24 : 0.0;
      player.bankRoll += (groundBank - player.bankRoll) * Math.min(1, dt * 11);
      player.runCycle += Math.hypot(player.vx, player.vz) * dt * 1.55;
    }
    player.diveEnergy = Math.max(0, player.diveEnergy - dt * 2.5);
    player.wasDiving = false;
  } else {
    // Airborne: Shift Dive Tuck vs Hold-Space Dress Hover-Glide vs Normal Air Control
    const isDiving = input.diveHeld;
    const isHoverGliding = profile.canGlide && !isDiving && input.jumpHeld && player.vy < 0.8;

    if (isDiving) {
      player.vy -= profile.diveGravity * dt;
      if (player.vy < -21.5) player.vy = -21.5;
      player.diveEnergy = Math.min(1.0, player.diveEnergy + dt * 1.4);
      player.vx += wishX * 16.5 * dt;
      player.vz += wishZ * 16.5 * dt;
      player.glideSpread += (0.22 - player.glideSpread) * Math.min(1, dt * 9);
      player.bodyPitch += (0.96 - player.bodyPitch) * Math.min(1, dt * 8);
    } else {
      if (player.wasDiving && player.diveEnergy > 0.22) {
        const boost = player.diveEnergy;
        player.vy = Math.max(player.vy, 2.4 + boost * 6.8);
        const hDirX = -Math.sin(player.yaw);
        const hDirZ = -Math.cos(player.yaw);
        player.vx += hDirX * (3.2 + boost * 4.5);
        player.vz += hDirZ * (3.2 + boost * 4.5);
        player.diveEnergy = 0;
      }

      const gravity = isHoverGliding
        ? profile.glideGravity
        : player.vy < 0
          ? profile.gravityDown
          : profile.gravityUp;
      player.vy -= gravity * dt;

      const terminalSink = isHoverGliding ? profile.glideSinkCap : profile.terminalFall;
      if (player.vy < terminalSink) {
        player.vy += (terminalSink - player.vy) * Math.min(1, dt * 9.0);
      }

      const airAccel = isHoverGliding ? profile.airAccel * 1.09 : profile.airAccel;
      player.vx += wishX * airAccel * dt;
      player.vz += wishZ * airAccel * dt;

      const dragBase = isHoverGliding ? Math.max(0.24, profile.airDrag * 0.82) : profile.airDrag;
      const drag = Math.pow(dragBase, dt);
      player.vx *= drag;
      player.vz *= drag;

      const targetSpread = isHoverGliding ? 1.0 : player.vy < 0 ? 0.62 : 0.38;
      player.glideSpread += (targetSpread - player.glideSpread) * Math.min(1, dt * 9.0);
      const targetPitch = isHoverGliding ? 0.22 : player.vy < 0 ? 0.32 : -0.18;
      player.bodyPitch += (targetPitch - player.bodyPitch) * Math.min(1, dt * 7.0);
    }

    player.wasDiving = isDiving;

    const hSpeed = Math.hypot(player.vx, player.vz);
    const maxAirSpeed = isDiving ? Math.max(18.0, profile.maxAirSpeed + 3.0) : profile.maxAirSpeed;
    if (hSpeed > maxAirSpeed) {
      player.vx = (player.vx / hSpeed) * maxAirSpeed;
      player.vz = (player.vz / hSpeed) * maxAirSpeed;
    }

    const targetRoll = -input.strafe * 0.44 * profile.bankScale;
    player.bankRoll += (targetRoll - player.bankRoll) * Math.min(1, dt * 7.5);
  }

  // 7. Vertical Updraft Wind Columns (catapults player skyward & refills jumps!)
  const wasInUpdraft = player.inUpdraft;
  player.inUpdraft = false;
  for (let i = 0; i < updrafts.length; i++) {
    const u = updrafts[i];
    const dXZ = Math.hypot(player.x - u.x, player.z - u.z);
    if (dXZ <= u.radius && player.y >= u.baseY - 1.5 && player.y <= u.topY) {
      player.inUpdraft = true;
      player.onGround = false;
      player.isSliding = false;
      player.groundedCardId = null;
      player.jumpsUsed = 0;
      player.dashCooldown = 0;
      const targetLift = input.diveHeld ? -4.0 : u.liftStrength * profile.updraftMult;
      player.vy += (targetLift - player.vy) * Math.min(1, dt * 7.5);
      player.glideSpread += (1.0 - player.glideSpread) * Math.min(1, dt * 10.0);
      if (!wasInUpdraft) {
        callbacks.onUpdraft?.();
      }
      break;
    }
  }

  // 8. Integrate position
  const prevY = player.y;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.z += player.vz * dt;

  // 9. Walkable Castle Wall Collisions (solid playing-card walls, open doorways!)
  const playerRadius = 0.55;
  for (let i = 0; i < cards.length; i++) {
    const w = cards[i];
    if (!w.isWall) continue;
    // Vertical extent of standing wall card (rotX ≈ PI/2 -> height is scaleZ)
    const halfH = w.scaleZ * 0.5;
    if (player.y + 1.4 < w.curY - halfH || player.y > w.curY + halfH) continue;

    const dx = player.x - w.baseX;
    const dz = player.z - w.baseZ;
    const cosR = Math.cos(-w.rotY);
    const sinR = Math.sin(-w.rotY);
    const lx = dx * cosR - dz * sinR;
    const lz = dx * sinR + dz * cosR;

    const halfW = w.scaleX * 0.5;
    const halfT = w.scaleY * 0.5 + 0.14; // thickness along local Z
    const clampedX = Math.max(-halfW, Math.min(halfW, lx));
    const clampedZ = Math.max(-halfT, Math.min(halfT, lz));
    const penX = lx - clampedX;
    const penZ = lz - clampedZ;
    const dist = Math.hypot(penX, penZ);

    if (dist < playerRadius) {
      let pushLX = 0;
      let pushLZ = 0;
      if (dist > 0.0001) {
        const push = playerRadius - dist;
        pushLX = (penX / dist) * push;
        pushLZ = (penZ / dist) * push;
      } else {
        pushLZ = lz >= 0 ? playerRadius : -playerRadius;
      }
      const cosW = Math.cos(w.rotY);
      const sinW = Math.sin(w.rotY);
      player.x += pushLX * cosW - pushLZ * sinW;
      player.z += pushLX * sinW + pushLZ * cosW;
    }
  }

  // 10. Walkable Card Platform & Sloped Slide Collision Detection
  const wasGrounded = player.onGround;
  const prevCardId = player.groundedCardId;
  player.onGround = false;
  player.isSliding = false;
  player.groundedCardId = null;

  let bestLandingCard: WorldCardRecord | null = null;
  let bestTopY = -Infinity;
  let bestLx = 0;
  let bestLz = 0;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!isCardCurrentlySolid(c)) continue;

    const dx = player.x - c.baseX;
    const dz = player.z - c.baseZ;
    const cosR = Math.cos(-c.rotY);
    const sinR = Math.sin(-c.rotY);
    const lx = dx * cosR - dz * sinR;
    const lz = dx * sinR + dz * cosR;

    const halfW = c.scaleX * 0.5 + 0.18;
    const halfL = c.scaleZ * 0.5 * Math.max(0.35, Math.cos(c.rotX)) + 0.18;
    if (Math.abs(lx) <= halfW && Math.abs(lz) <= halfL) {
      const topY = getCardSurfaceY(c, lz);
      const slopeMargin = Math.abs(c.rotX) > 0.05 ? 0.65 : 0.28;
      const crossedDown = prevY >= topY - 0.52 && player.y <= topY + slopeMargin && player.vy <= 1.2;
      const stayingOn =
        wasGrounded &&
        (prevCardId === c.id || Math.abs(player.y - topY) < 0.55) &&
        Math.abs(player.y - topY) < 0.72 &&
        player.vy <= 1.2;

      if ((crossedDown || stayingOn) && topY > bestTopY) {
        bestTopY = topY;
        bestLandingCard = c;
        bestLx = lx;
        bestLz = lz;
      }
    }
  }

  if (bestLandingCard) {
    const c = bestLandingCard;
    const impactVy = Math.abs(player.vy);
    player.y = bestTopY + 0.01;
    player.vy = 0;
    player.onGround = true;
    player.isSliding = c.isSlide;
    player.groundedCardId = c.id;
    player.jumpsUsed = 0;
    player.dashCooldown = Math.min(player.dashCooldown, 0.15);

    if (!wasGrounded || prevCardId !== c.id) {
      const impulse = Math.min(4.8, 1.2 + impactVy * 0.28);
      if (
        c.kind === 'platform' ||
        c.kind === 'unfolding' ||
        c.kind === 'phantom' ||
        c.kind === 'catch'
      ) {
        c.dipVel -= impulse * (c.kind === 'catch' ? 1.15 : 1.0);
        const nx = bestLx / Math.max(0.5, c.scaleX * 0.5);
        const nz = bestLz / Math.max(0.5, c.scaleZ * 0.5);
        c.tiltVelZ -= nx * impulse * 0.22;
        c.tiltVelX += nz * impulse * 0.18;
      }

      if (!c.isSlide && !wasGrounded) {
        player.vx *= profile.landingDamp;
        player.vz *= profile.landingDamp;
      }

      const isNew = c.kind !== 'catch' && !c.visited;
      if (isNew) {
        c.visited = true;
        player.cardsVisited += 1;
      }
      if (c.isCheckpoint) {
        player.checkpointCardId = c.id;
      }
      callbacks.onCardLand?.(c, isNew, c.isCheckpoint);
    }
  }

  // 11. Cloud-break descent trigger when diving or falling below the floating deck!
  if (!player.onGround && !player.inUpdraft && player.y < CLOUD_BREAK_Y) {
    player.descending = true;
    player.glideSpread = 1.0;
    callbacks.onDescentStart?.();
  }
}
