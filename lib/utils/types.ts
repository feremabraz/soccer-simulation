export type TeamId = string;
export type PlayerId = number;
export type PlayerRole = 'GK' | 'DEF' | 'MID' | 'FWD';
export type TeamSide = 'home' | 'away';
export type GameState = 'idle' | 'playing' | 'paused' | 'halftime' | 'fulltime' | 'extratime';
export type EventType =
  | 'pass'
  | 'shot'
  | 'goal'
  | 'save'
  | 'tackle'
  | 'foul'
  | 'offside'
  | 'corner'
  | 'throwin'
  | 'goalkick'
  | 'freekick'
  | 'penalty'
  | 'yellowcard'
  | 'redcard'
  | 'substitution'
  | 'kickoff'
  | 'halftime'
  | 'fulltime'
  | 'collision'
  | 'ballOutOfBounds'
  | 'impact'
  | 'bounce'
  | 'deflection'
  | 'blockade'
  | 'intercept'
  | 'bodyCheck'
  | 'dribblePast'
  | 'losePossession'
  | 'slideTackle'
  | 'standingTackle'
  | 'acceleration'
  | 'deceleration'
  | 'sprint';

export type FormationType = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-5-1';
export type TacticStyle = 'possession' | 'counter' | 'direct' | 'wing' | 'pressing';
export type DefensiveStyle = 'highpress' | 'midblock' | 'lowblock' | 'manmarking' | 'zonalmarking';

export interface Vector2D {
  x: number;
  y: number;
}

export interface ForceVector extends Vector2D {
  magnitude: number;
  direction?: number; // Direction in radians
  duration?: number; // Duration of force application
  impulse?: boolean; // If true, this is an instantaneous impulse rather than a continuous force
  point?: Vector2D; // Point of application (if not center of mass)
}

export interface PhysicsProperties {
  mass: number;
  friction: number;
  restitution: number;
  airFriction: number;
  density: number;
  // Enhanced physics properties
  inertia?: number; // Object's resistance to changes in rotational motion
  frictionStatic?: number; // Static friction coefficient
  frictionAir?: number; // Air friction coefficient
  torque?: number; // Rotational force
  angularVelocity?: number; // Speed of rotation
  angularSpeed?: number; // Magnitude of angular velocity
  angle?: number; // Current angle in radians
  slop?: number; // Collision tolerance
  stiffness?: number; // Spring stiffness
  timeScale?: number; // Time scaling factor
}

export interface CollisionEvent {
  entityA: string;
  entityB: string;
  point: Vector2D;
  force: number;
  normalVector: Vector2D;
  timestamp: number;
  collisionType?: 'start' | 'active' | 'end'; // Phase of collision
  impactVelocity?: Vector2D; // Velocity at impact
  frictionImpulse?: number; // Impulse due to friction
  separationVelocity?: number; // Velocity of separation after impact
  restitution?: number; // Effective restitution of the collision
  depth?: number; // Penetration depth of the collision
  entityAType?: 'ball' | 'player' | 'boundary'; // Type of first entity
  entityBType?: 'ball' | 'player' | 'boundary'; // Type of second entity
  tangentImpulse?: Vector2D; // Tangential impulse
  duration?: number; // Duration of contact
}

export interface PlayerAttributes {
  // Technical
  passing: number;
  shooting: number;
  dribbling: number;
  tackling: number;
  heading: number;
  firstTouch: number;
  technique: number;
  finishing: number;
  longShots: number;
  crossing: number;
  freeKicks: number;
  penaltyTaking: number;
  corners: number;
  ballControl: number;

  // Physical
  speed: number;
  stamina: number;
  strength: number;
  agility: number;
  acceleration: number;
  topSpeed: number;
  balance: number;
  jumpingReach: number;
  // Enhanced physical attributes
  aggressionPhysical: number; // Physical aggression in challenges
  injuryResistance: number; // Resistance to injuries
  naturalFitness: number; // Natural fitness level
  workRate: number; // Overall work rate
  aerialAbility: number; // Ability in aerial duels
  sprintRecovery: number; // How quickly player recovers from sprints
  turnSpeed: number; // How quickly player can change direction
  explosivePower: number; // Explosive power for quick bursts
  brakingPower: number; // Ability to stop quickly

  // Mental
  vision: number;
  positioning: number;
  decisions: number;
  aggression: number;
  teamwork: number;
  anticipation: number;
  concentration: number;
  composure: number;
  determination: number;
  leadership: number;
  offTheBall: number;
  tacticalDiscipline: number;
  spatialAwareness: number;

  // Role-specific
  goalkeeping?: number;
}

export interface PlayerData {
  id: PlayerId;
  name: string;
  position: Vector2D;
  role: PlayerRole;
  attributes: PlayerAttributes;
  number: number;
}

export interface TeamData {
  id: TeamId;
  name: string;
  color: string;
  secondaryColor: string;
  players: PlayerData[];
  formation: FormationType;
  tactics: {
    style: TacticStyle;
    defensiveStyle: DefensiveStyle;
    pressingIntensity: number;
    defensiveLineHeight: number;
    width: number;
    tempo: number;
    passingStyle: 'short' | 'mixed' | 'long';
  };
}

export interface GameEvent {
  type: EventType;
  time: number;
  message: string;
  player1Id?: PlayerId;
  player2Id?: PlayerId;
  teamId?: TeamId;
  position?: Vector2D;
  // Enhanced event properties
  velocity?: Vector2D; // Velocity related to the event (e.g. shot speed)
  force?: number; // Force magnitude for physics events
  direction?: Vector2D; // Direction vector
  success?: boolean; // Whether the action was successful
  expectedGoals?: number; // xG for shot events
  collisionData?: CollisionEvent; // For collision events
  distance?: number; // Distance related to the event
  height?: number; // Height of the ball for aerial events
  spin?: Vector2D; // Ball spin
  bodyPart?: 'head' | 'leftFoot' | 'rightFoot' | 'chest' | 'other'; // Body part used
  outcome?: string; // Outcome description
}

export interface IMatchState {
  gameState: GameState;
  gameSpeed: number;
  gameTime: number;
  half: 1 | 2 | 3 | 4; // 3 and 4 for extra time
  score: {
    home: number;
    away: number;
  };
  possession: TeamSide;
  lastTouchTeam: TeamSide;
  offsideLine: {
    home: number;
    away: number;
  };
  setpiece: {
    type: EventType | null;
    team: TeamSide | null;
    position: Vector2D | null;
  };
  cards: {
    yellow: PlayerId[];
    red: PlayerId[];
  };
  substitutionsLeft: {
    home: number;
    away: number;
  };
  injuries: PlayerId[];
  stoppageTime: number;
  stoppageTimeAdded: number;
}

export interface MatchStats {
  possession: {
    home: number;
    away: number;
  };
  shots: {
    home: number;
    away: number;
  };
  shotsOnTarget: {
    home: number;
    away: number;
  };
  corners: {
    home: number;
    away: number;
  };
  fouls: {
    home: number;
    away: number;
  };
  yellowCards: {
    home: number;
    away: number;
  };
  redCards: {
    home: number;
    away: number;
  };
  offsides: {
    home: number;
    away: number;
  };
  passes: {
    home: number;
    away: number;
  };
  passAccuracy: {
    home: number;
    away: number;
  };
  // Physics-based stats
  physicsStats?: PhysicsStats;
}

// Physics-related interfaces

/**
 * Represents a physical body's state in the physics engine
 */
export interface PhysicsBodyState {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  angle: number;
  angularVelocity: number;
  mass: number;
  inertia: number;
  staticFriction: number;
  kinematicFriction: number;
  restitution: number;
  bounds: {
    min: Vector2D;
    max: Vector2D;
  };
  isSleeping: boolean;
  isSensor: boolean;
  isStatic: boolean;
}

/**
 * Represents ball-specific physics properties
 */
export interface BallPhysicsProperties extends PhysicsProperties {
  spinDecay: number; // How quickly spin effects diminish
  dragCoefficient: number; // Air resistance factor
  liftCoefficient: number; // Magnus effect coefficient
  surfaceRoughness: number; // Surface roughness affecting spin
  deformationFactor: number; // How much the ball deforms on impact
}

/**
 * Represents player-specific physics properties
 */
export interface PlayerPhysicsProperties extends PhysicsProperties {
  stabilityFactor: number; // How stable a player is when challenged
  pushingPower: number; // Ability to push other players
  resistanceToPushing: number; // Resistance to being pushed
  turnRadius: number; // Minimum turning radius at top speed
  accelerationRate: number; // Rate of acceleration
  decelerationRate: number; // Rate of deceleration
  lateralMovementFriction: number; // Friction for side movement
  balancingFactor: number; // Ability to maintain balance
  recoveryRate: number; // Rate of recovery after being unbalanced
}

/**
 * Properties for a physics-based shot
 */
export interface ShotProperties {
  initialVelocity: Vector2D;
  position: Vector2D;
  power: number;
  accuracy: number;
  spin: Vector2D;
  height: number;
  technique: 'drive' | 'chip' | 'curl' | 'volley' | 'header' | 'finesse';
  expectedGoals: number;
  trajectory: 'low' | 'medium' | 'high';
  bodyPart: 'leftFoot' | 'rightFoot' | 'head' | 'other';
}

/**
 * Properties for a physics-based pass
 */
export interface PassProperties {
  initialVelocity: Vector2D;
  targetPosition: Vector2D;
  power: number;
  accuracy: number;
  spin: Vector2D;
  height: number;
  technique: 'ground' | 'lofted' | 'through' | 'driven' | 'cross';
  isThrough: boolean;
  expectedCompletion: number;
  bodyPart: 'leftFoot' | 'rightFoot' | 'head' | 'chest';
}

/**
 * World constraints for physics simulation
 */
export interface WorldConstraints {
  pitch: {
    width: number;
    height: number;
    friction: number;
  };
  gravity: Vector2D;
  airDensity: number;
  windVector: Vector2D;
  weatherConditions: 'dry' | 'wet' | 'snowy' | 'windy';
  temperature: number;
  bounds: {
    min: Vector2D;
    max: Vector2D;
  };
}

/**
 * Represents a summary of the physics stats for analytics
 */
export interface PhysicsStats {
  distanceCovered: number;
  topSpeed: number;
  averageSpeed: number;
  sprintCount: number;
  accelerationCount: number;
  collisionCount: number;
  energyExpended: number;
  ballPossessionDuration: number;
  heatMap: number[][]; // Position frequency
  directionChanges: number;
  intensityZones: {
    walking: number; // time in seconds
    jogging: number;
    running: number;
    sprinting: number;
  };
}

/**
 * Physics timestep configuration
 */
export interface PhysicsTimeStep {
  delta: number; // Time step in ms
  maxSteps: number; // Maximum steps per update
  timeScale: number; // Scaling factor for time
  interpolation: boolean; // Whether to use interpolation
}
