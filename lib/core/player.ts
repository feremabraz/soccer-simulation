import { physicsEngine } from '@/lib/physics';
import type {
  ForceVector,
  PhysicsProperties,
  PlayerAttributes,
  PlayerId,
  PlayerRole,
  TeamSide,
  Vector2D,
} from '@/lib/utils/types';
import type { BallEntity } from './';
import { Entity } from './entity';

// Player entity
export class PlayerEntity extends Entity {
  id: PlayerId;
  name: string;
  team: TeamSide;
  role: PlayerRole;
  number: number;
  targetPosition: Vector2D;
  attributes: PlayerAttributes;
  fatigue = 0;
  hasBall = false;
  isMarking: PlayerId | null = null;
  isBeingMarkedBy: PlayerId | null = null;
  state: 'idle' | 'moving' | 'withBall' | 'marking' | 'supporting' | 'defending' = 'idle';
  yellowCard = false;
  redCard = false;
  injured = false;

  // Physics properties
  physicsId = '';
  velocity: Vector2D = { x: 0, y: 0 };
  maxSpeed = 0; // Will be calculated from attributes
  acceleration = 0; // Will be calculated from attributes
  momentum = 0; // Current momentum value
  bodyMass = 0; // Player mass in kg
  restitution = 0.2; // Player bounciness (lower than ball)

  // Physics properties for Matter.js
  physicsProperties: PhysicsProperties = {
    mass: 70, // Default 70kg
    friction: 0.05,
    restitution: 0.2,
    airFriction: 0,
    density: 0.002, // kg/m³ (human body density approximation)
  };

  // Behavior state
  lastAction: string | null = null;
  decisionCooldown = 0;

  constructor(
    id: PlayerId,
    name: string,
    team: TeamSide,
    position: Vector2D,
    role: PlayerRole,
    attributes: PlayerAttributes,
    number: number
  ) {
    super(position);
    this.id = id;
    this.name = name;
    this.team = team;
    this.role = role;
    this.number = number;
    this.targetPosition = { ...position };
    this.attributes = attributes;

    // Set physics properties based on attributes
    this.setPhysicsFromAttributes();

    // Generate physics ID from team and player ID
    this.physicsId = `player_${team}_${id}`;

    // Initialize physics entity
    this.initPhysics();
  }

  /**
   * Set physics properties based on player attributes
   */
  private setPhysicsFromAttributes(): void {
    // Calculate max speed based on player's speed attribute (0-100 scale)
    // Convert to m/s (top players reach ~9-10 m/s)
    this.maxSpeed = (this.attributes.topSpeed || this.attributes.speed) * 0.1;

    // Calculate acceleration based on acceleration attribute
    this.acceleration = (this.attributes.acceleration || this.attributes.speed * 0.8) * 0.05;

    // Calculate mass based on strength attribute (65-95kg range)
    this.bodyMass = 65 + this.attributes.strength * 0.3;
    this.physicsProperties.mass = this.bodyMass;

    // Update physics properties for Matter.js
    this.physicsProperties.restitution = 0.2 + this.attributes.balance * 0.001;
    this.physicsProperties.friction = 0.05 + this.attributes.strength * 0.001;
  }

  /**
   * Initialize player's physics body
   */
  private initPhysics(): void {
    // Create physics entity for the player
    const physicsEntity = physicsEngine.createPlayer(this.physicsId, this.position, this);

    // If creation succeeded, set up initial physics state
    if (physicsEntity) {
      console.log(`Player physics entity created with id ${this.physicsId}`);
    }
  }

  update(gameSpeed: number, ball: BallEntity): void {
    // Update fatigue
    this.fatigue += 0.001 * gameSpeed * (1 / this.attributes.stamina);
    if (this.fatigue > 1) this.fatigue = 1;

    // Calculate effective attributes based on fatigue
    const effectiveSpeed = this.getEffectiveAttribute('speed') * gameSpeed * 0.05;
    const effectiveAcceleration = this.getEffectiveAttribute('acceleration') * gameSpeed * 0.02;

    // Physics-based movement to target position
    this.moveToPhysics(this.targetPosition, effectiveSpeed, effectiveAcceleration);

    // Get updated position and velocity from physics engine
    const physicsPosition = physicsEngine.getPosition(this.physicsId);
    const physicsVelocity = physicsEngine.getVelocity(this.physicsId);

    if (physicsPosition) {
      this.position = physicsPosition;
    }

    if (physicsVelocity) {
      this.velocity = physicsVelocity;

      // Calculate momentum (magnitude of velocity × mass)
      const speed = Math.sqrt(
        this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
      );
      this.momentum = speed * this.bodyMass;
    }

    // Update decision cooldown
    if (this.decisionCooldown > 0) {
      this.decisionCooldown -= gameSpeed;
    }

    // Update state based on ball position
    if (ball.possessor === this) {
      this.state = 'withBall';
      this.hasBall = true;
      return;
    }

    // If we don't have the ball
    this.hasBall = false;

    // Update state based on team possession and role
    if (ball.possessor && ball.possessor.team === this.team) {
      this.state = 'supporting';
      return;
    }

    this.state = 'defending';
  }

  setTarget(target: Vector2D): void {
    // Keep target position within bounds
    this.targetPosition = {
      x: Math.max(5, Math.min(95, target.x)),
      y: Math.max(5, Math.min(95, target.y)),
    };
  }

  // Calculate the effective attribute value considering fatigue
  getEffectiveAttribute(attribute: keyof PlayerAttributes): number {
    const baseValue = this.attributes[attribute] as number;
    return baseValue * (1 - this.fatigue * 0.5);
  }

  /**
   * Physics-based movement towards a target position
   * @param target Target position to move towards
   * @param maxSpeed Maximum speed the player can reach
   * @param acceleration How quickly the player accelerates
   */
  moveToPhysics(target: Vector2D, maxSpeed: number, acceleration: number): void {
    // Calculate direction to target
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If we're very close to target, slow down
    if (distance < 1) {
      const slowVelocity = {
        x: this.velocity.x * 0.8,
        y: this.velocity.y * 0.8,
      };
      physicsEngine.setVelocity(this.physicsId, slowVelocity);
      return;
    }

    // If we're close enough to target, don't move
    if (distance <= 2) {
      return;
    }

    // Normalize direction
    const directionX = dx / distance;
    const directionY = dy / distance;

    // Calculate desired force based on distance and player stats
    let forceMagnitude = acceleration * this.bodyMass;

    // If we're close to the target, start slowing down
    if (distance < 10) {
      forceMagnitude *= distance / 10;
    }

    // Create force vector
    const force: ForceVector = {
      x: directionX * forceMagnitude,
      y: directionY * forceMagnitude,
      magnitude: forceMagnitude,
    };

    // Apply force to move player
    physicsEngine.applyForce(this.physicsId, force);

    // Limit maximum velocity
    const currentSpeed = Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
    );

    if (currentSpeed > maxSpeed) {
      // Scale down velocity to max speed
      const scaleFactor = maxSpeed / currentSpeed;
      const newVelocity = {
        x: this.velocity.x * scaleFactor,
        y: this.velocity.y * scaleFactor,
      };

      // Set the new velocity
      physicsEngine.setVelocity(this.physicsId, newVelocity);
    }
  }

  /**
   * Apply a force to the player
   * @param force Force vector to apply
   */
  applyForce(force: ForceVector): void {
    physicsEngine.applyForce(this.physicsId, force);
  }

  /**
   * Instantly set player velocity
   * @param velocity New velocity vector
   */
  setVelocity(velocity: Vector2D): void {
    physicsEngine.setVelocity(this.physicsId, velocity);
    this.velocity = velocity;
  }

  /**
   * Reset player's physics state
   * @param position New position for reset
   */
  resetPhysics(position: Vector2D): void {
    // Reset position and state
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.momentum = 0;

    // Update physics engine
    physicsEngine.updateEntityPosition(this.physicsId, position);
    physicsEngine.setVelocity(this.physicsId, { x: 0, y: 0 });
  }

  // Behavior tree root decision
  makeDecision(ball: BallEntity, teammates: PlayerEntity[], opponents: PlayerEntity[]): string {
    if (this.decisionCooldown > 0) return this.lastAction || 'wait';

    // Set a cooldown to prevent constant decision changes
    this.decisionCooldown = 0.5;

    if (this.hasBall) {
      return this.decideWithBall(ball, teammates, opponents);
    }

    if (this.team === ball.lastTouchTeam) {
      return this.decideOffensiveSupport(ball, teammates, opponents);
    }

    return this.decideDefensiveAction(ball, teammates, opponents);
  }

  private decideWithBall(
    _ball: BallEntity,
    teammates: PlayerEntity[],
    opponents: PlayerEntity[]
  ): string {
    // Find closest opponent
    const closestOpponent = this.findClosestEntity(opponents) as PlayerEntity;
    const distanceToOpponent = closestOpponent ? this.distanceTo(closestOpponent) : 100;

    // Check if in shooting range (closer to goal = better chance)
    const isInShootingRange = this.isInShootingRange();

    // Decision tree
    if (isInShootingRange && Math.random() < this.getEffectiveAttribute('shooting') * 0.7) {
      this.lastAction = 'shoot';
      return 'shoot';
    }

    if (distanceToOpponent < 10) {
      // Under pressure, decide between pass and dribble
      const passingChance = this.getEffectiveAttribute('passing') * 0.8;
      const dribblingChance = this.getEffectiveAttribute('dribbling') * 0.6;

      if (passingChance > dribblingChance) {
        const bestPassTarget = this.findBestPassTarget(teammates, opponents);
        if (bestPassTarget) {
          this.lastAction = 'pass';
          return 'pass';
        }
      }

      if (Math.random() < dribblingChance) {
        this.lastAction = 'dribble';
        return 'dribble';
      }
    }

    // Default: find a pass
    this.lastAction = 'pass';
    return 'pass';
  }

  private decideOffensiveSupport(
    ball: BallEntity,
    _teammates: PlayerEntity[],
    _opponents: PlayerEntity[]
  ): string {
    // Find space to receive a pass
    const distanceToBall = this.distanceTo(ball);

    if (distanceToBall < 20) {
      // Close to the ball, provide support
      this.lastAction = 'supportNear';
      return 'supportNear';
    }

    // Further from ball, make a run or maintain formation
    if (Math.random() < this.getEffectiveAttribute('positioning') * 0.5) {
      this.lastAction = 'makeRun';
      return 'makeRun';
    }

    this.lastAction = 'maintainFormation';
    return 'maintainFormation';
  }

  private decideDefensiveAction(
    ball: BallEntity,
    _teammates: PlayerEntity[],
    opponents: PlayerEntity[]
  ): string {
    // Find ball possessor
    const ballPossessor = ball.possessor;

    // No one has the ball, go for it
    if (!ballPossessor) {
      const distanceToBall = this.distanceTo(ball);
      if (distanceToBall < 15) {
        this.lastAction = 'chaseBall';
        return 'chaseBall';
      }

      this.lastAction = 'maintainDefensivePosition';
      return 'maintainDefensivePosition';
    }

    // Someone from the other team has the ball
    const distanceToPossessor = this.distanceTo(ballPossessor);

    if (distanceToPossessor < 10) {
      // Close to possessor, press or tackle
      const tackleChance = this.getEffectiveAttribute('tackling') * 0.7;
      if (Math.random() < tackleChance || distanceToPossessor < 5) {
        this.lastAction = 'pressBall';
        return 'pressBall';
      }
    }

    // Mark a nearby opponent
    const nearbyOpponent = this.findNearbyPlayerToMark(opponents);
    if (nearbyOpponent) {
      this.lastAction = 'markPlayer';
      this.isMarking = nearbyOpponent.id;
      return 'markPlayer';
    }

    this.lastAction = 'maintainDefensivePosition';
    return 'maintainDefensivePosition';
  }

  private isInShootingRange(): boolean {
    const isHome = this.team === 'home';
    const goalX = isHome ? 90 : 10;
    const distanceToGoal = Math.abs(this.position.x - goalX);
    const angleToGoal = Math.abs(this.position.y - 50);

    // Better chance if closer and more central
    return distanceToGoal < 25 && angleToGoal < 20;
  }

  private findClosestEntity(entities: Entity[]): Entity | null {
    if (!entities.length) return null;

    let closest = entities[0];
    let closestDistance = this.distanceTo(closest);

    for (let i = 1; i < entities.length; i++) {
      const distance = this.distanceTo(entities[i]);
      if (distance < closestDistance) {
        closest = entities[i];
        closestDistance = distance;
      }
    }

    return closest;
  }

  private findBestPassTarget(
    teammates: PlayerEntity[],
    opponents: PlayerEntity[]
  ): PlayerEntity | null {
    if (!teammates.length) return null;

    let bestTarget: PlayerEntity | null = null;
    let bestScore = -1;

    for (const teammate of teammates) {
      if (teammate === this) continue;

      const distanceToTeammate = this.distanceTo(teammate);
      if (distanceToTeammate > 30) continue; // Too far

      // Check if pass is blocked
      let isBlocked = false;
      for (const opponent of opponents) {
        const distanceToOpponent = this.distanceTo(opponent);
        if (distanceToOpponent > distanceToTeammate) continue; // Opponent is further away

        const angleToTeammate = Math.atan2(
          teammate.position.y - this.position.y,
          teammate.position.x - this.position.x
        );
        const angleToOpponent = Math.atan2(
          opponent.position.y - this.position.y,
          opponent.position.x - this.position.x
        );

        if (Math.abs(angleToTeammate - angleToOpponent) < 0.3) {
          isBlocked = true;
          break;
        }
      }

      if (isBlocked) continue;

      // Calculate pass score based on various factors
      const isGoalkeeper = teammate.role === 'GK';
      const isForward = teammate.role === 'FWD';
      const isAdvancing =
        this.team === 'home'
          ? teammate.position.x > this.position.x
          : teammate.position.x < this.position.x;

      let score = 10 - distanceToTeammate * 0.2; // Prefer closer teammates
      if (isGoalkeeper) score -= 5; // Avoid passing back to goalkeeper
      if (isForward) score += 2; // Prefer forwards
      if (isAdvancing) score += 3; // Prefer advancing the ball

      if (score > bestScore) {
        bestScore = score;
        bestTarget = teammate;
      }
    }

    return bestTarget;
  }

  private findNearbyPlayerToMark(opponents: PlayerEntity[]): PlayerEntity | null {
    if (!opponents.length) return null;

    const isDefender = this.role === 'DEF';
    const maxMarkingDistance = isDefender ? 20 : 15;

    let bestTarget: PlayerEntity | null = null;
    let bestScore = -1;

    for (const opponent of opponents) {
      const distance = this.distanceTo(opponent);
      if (distance > maxMarkingDistance) continue;

      // Don't mark players already being marked
      if (opponent.isBeingMarkedBy !== null) continue;

      // Calculate marking score
      let score = 10 - distance * 0.5; // Prefer closer opponents
      if (opponent.role === 'FWD') score += 3; // Prioritize marking forwards
      if (opponent.hasBall) score += 5; // Prioritize marking ball possessor

      if (score > bestScore) {
        bestScore = score;
        bestTarget = opponent;
      }
    }

    // If target found, mark them
    if (bestTarget) {
      bestTarget.isBeingMarkedBy = this.id;
    }

    return bestTarget;
  }

  /**
   * Update player AI using the behavior tree and team tactical state
   * Used by the match engine to process AI decisions with team context
   *
   * @param context The behavior context including ball, teammates, opponents, and team tactical state
   */
  updateAI(context: {
    ball: BallEntity;
    teammates: PlayerEntity[];
    opponents: PlayerEntity[];
    teamTacticalState?: {
      currentBehavior: string;
      pressingIntensity: number;
      defensiveLineHeight: number;
      width: number;
      verticalCompactness: number;
      passingStyle: 'short' | 'mixed' | 'long';
      tempo: number;
      markingAssignments: Map<string, string>;
    };
    playerToMark?: PlayerEntity;
    deltaTime: number;
  }): void {
    const { ball, teammates, opponents, teamTacticalState, playerToMark } = context;

    // If there's a specific player to mark based on team tactics
    if (playerToMark) {
      this.isMarking = playerToMark.id;
      this.lastAction = 'markPlayer';

      // Move to a position near the player to mark
      const offsetX = Math.random() * 4 - 2; // Small random offset
      const offsetY = Math.random() * 4 - 2;
      this.setTarget({
        x: playerToMark.position.x + offsetX,
        y: playerToMark.position.y + offsetY,
      });
      return;
    }

    // Apply team tactical parameters if available
    if (teamTacticalState) {
      // Adjust player behavior based on team tactical state
      // For example, pressing intensity affects how aggressively players chase the ball
      const { pressingIntensity, currentBehavior } = teamTacticalState;

      // Higher pressing intensity means players are more likely to chase the ball
      if (currentBehavior === 'highPress' && pressingIntensity > 7) {
        if (this.distanceTo(ball) < 25) {
          this.lastAction = 'chaseBall';
          this.setTarget(ball.position);
          return;
        }
      }

      // Low block means players stay more compact and defensive
      if (currentBehavior === 'lowBlock' || currentBehavior === 'parkTheBus') {
        // Defensive players stay back more
        if (this.role === 'DEF' || this.role === 'MID') {
          this.lastAction = 'maintainDefensivePosition';
          return;
        }
      }

      // Special behavior for counter attacks
      if (currentBehavior === 'counterAttack' && ball.lastTouchTeam === this.team) {
        // Forwards and midfielders make more forward runs during counter attacks
        if (this.role === 'FWD' || (this.role === 'MID' && Math.random() > 0.5)) {
          this.lastAction = 'makeRun';
          return;
        }
      }
    }

    // Fall back to basic behavior tree logic if no team-specific behavior was applied
    const decision = this.makeDecision(ball, teammates, opponents);

    // Apply the decision
    switch (decision) {
      case 'chaseBall': {
        this.setTarget(ball.position);
        break;
      }
      case 'markPlayer': {
        const playerToMark = this.findNearbyPlayerToMark(opponents);
        if (playerToMark) {
          this.setTarget(playerToMark.position);
        }
        break;
      }
      case 'makeRun': {
        // Advanced forward run for attackers
        const isHome = this.team === 'home';
        const forwardDirection = isHome ? 1 : -1;
        this.setTarget({
          x: this.position.x + forwardDirection * 15,
          y: this.position.y + (Math.random() * 20 - 10),
        });
        break;
      }
      // Add more cases as needed
    }
  }
}
