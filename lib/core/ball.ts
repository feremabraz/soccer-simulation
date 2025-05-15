import { physicsEngine } from '@/lib/physics';
import type { ForceVector, PhysicsProperties, TeamSide, Vector2D } from '@/lib/utils/types';
import { Entity } from './entity';
import type { PlayerEntity } from './player';

// Ball entity
export class BallEntity extends Entity {
  possessor: PlayerEntity | null = null;
  lastTouchTeam: TeamSide = 'home';
  velocity: Vector2D = { x: 0, y: 0 };
  inAir = false;
  height = 0;
  spin: Vector2D = { x: 0, y: 0 };
  physicsId = '';
  airResistance = 0.98;
  groundFriction = 0.9;
  restitution = 0.8; // Bounciness
  mass = 0.45; // kg (standard soccer ball weight)

  // Physics properties for Matter.js
  physicsProperties: PhysicsProperties = {
    mass: 0.45,
    friction: 0.01,
    restitution: 0.8,
    airFriction: 0.001,
    density: 0.0012, // kg/m³ (approximate football density)
  };

  constructor(position: Vector2D, id = 'ball') {
    super(position);
    this.physicsId = id;
    this.initPhysics();
  }

  // Initialize physics for the ball
  private initPhysics(): void {
    // Create physics entity for the ball
    const physicsEntity = physicsEngine.createBall(this.physicsId, this.position, this);

    // If creation succeeded, set up initial physics state
    if (physicsEntity) {
      console.log(`Ball physics entity created with id ${this.physicsId}`);
    }
  }

  update(gameSpeed: number): void {
    if (this.possessor) {
      // Ball follows possessor
      this.position = { ...this.possessor.position };

      // Update physics entity position
      physicsEngine.updateEntityPosition(this.physicsId, this.position);
      physicsEngine.setVelocity(this.physicsId, { x: 0, y: 0 });
    } else {
      // Ball movement is handled by physics engine
      // Get position from physics engine
      const physicsPosition = physicsEngine.getPosition(this.physicsId);
      if (physicsPosition) {
        this.position = physicsPosition;
      }

      // Get velocity from physics engine
      const physicsVelocity = physicsEngine.getVelocity(this.physicsId);
      if (physicsVelocity) {
        this.velocity = physicsVelocity;

        // Determine if the ball is in air based on speed and spin
        const speed = Math.sqrt(
          this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
        );

        // Apply spin effects if in air (Magnus effect)
        if (this.inAir && (this.spin.x !== 0 || this.spin.y !== 0)) {
          // Calculate spin effect (simplified Magnus effect)
          const spinForce: ForceVector = {
            x: this.spin.y * -0.01 * speed, // Cross product simplified
            y: this.spin.x * 0.01 * speed,
            magnitude:
              0.01 * speed * Math.sqrt(this.spin.x * this.spin.x + this.spin.y * this.spin.y),
          };

          // Apply spin force
          physicsEngine.applyForce(this.physicsId, spinForce);
        }

        // Update height if in air (will affect rendering but not physics)
        if (this.inAir) {
          this.height -= 0.2 * gameSpeed;
          if (this.height <= 0) {
            this.height = 0;
            this.inAir = false;
          }
        }
      }
    }
  }

  setPossessor(player: PlayerEntity | null): void {
    if (player) {
      this.possessor = player;
      this.lastTouchTeam = player.team;
      this.velocity = { x: 0, y: 0 };
      this.spin = { x: 0, y: 0 };
      this.inAir = false;
      this.height = 0;

      // Update physics entity to match player position
      physicsEngine.updateEntityPosition(this.physicsId, player.position);
      physicsEngine.setVelocity(this.physicsId, { x: 0, y: 0 });
    } else {
      this.possessor = null;
    }
  }

  kick(direction: Vector2D, power: number, isLofted = false, spinAmount = 0): void {
    this.possessor = null;

    // Calculate kick velocity based on power and direction
    const velocity = {
      x: direction.x * power * 0.2,
      y: direction.y * power * 0.2,
    };

    // Apply spin based on kick type
    // Positive spin is clockwise, negative is counter-clockwise
    if (spinAmount !== 0) {
      // Calculate perpendicular vector for spin
      this.spin = {
        x: -direction.y * spinAmount * 0.5,
        y: direction.x * spinAmount * 0.5,
      };
    } else {
      this.spin = { x: 0, y: 0 };
    }

    // Set ball velocity in physics engine
    physicsEngine.setVelocity(this.physicsId, velocity);
    this.velocity = velocity;

    if (isLofted) {
      this.inAir = true;
      this.height = 2 + power * 0.3;

      // Apply upward force for lofted kicks
      // This is a simplification as Matter.js is 2D
      // We'll track the height separately for rendering
      const loftForce = {
        x: 0,
        y: 0,
        magnitude: power * 0.05,
      };
      physicsEngine.applyForce(this.physicsId, loftForce);
    }
  }

  // Not needed anymore as physics engine handles boundaries
  // Keeping for compatibility if needed
  keepInBounds(): void {
    // Physics engine handles this now via pitch boundaries
    // This method is kept for backward compatibility
  }

  /**
   * Apply a force to the ball
   * @param force Force vector to apply
   */
  applyForce(force: ForceVector): void {
    physicsEngine.applyForce(this.physicsId, force);
  }

  /**
   * Reset the ball's physics state
   * @param position New position for reset
   */
  resetPhysics(position: Vector2D): void {
    // Reset position and state
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.spin = { x: 0, y: 0 };
    this.inAir = false;
    this.height = 0;

    // Update physics engine
    physicsEngine.updateEntityPosition(this.physicsId, position);
    physicsEngine.setVelocity(this.physicsId, { x: 0, y: 0 });
  }
}
