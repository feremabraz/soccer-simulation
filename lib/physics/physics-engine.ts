import { atom } from 'jotai';
import Matter from 'matter-js';
import type { Vector2D } from '../utils/types';

// Physics constants
const PITCH_WIDTH = 100;
const PITCH_HEIGHT = 100;
const BALL_RADIUS = 1.2;
const PLAYER_RADIUS = 2.0;
const DEFAULT_FRICTION = 0.05;
const DEFAULT_RESTITUTION = 0.8;
const DEFAULT_AIR_FRICTION = 0.01;
const DEFAULT_DENSITY = 0.001;

export interface PhysicsEntity {
  id: string;
  body: Matter.Body;
  type: 'ball' | 'player' | 'boundary';
  entityRef?: object; // Reference to the game entity
}

interface PhysicsEngineState {
  engine: Matter.Engine;
  world: Matter.World;
  runner: Matter.Runner;
  entities: Map<string, PhysicsEntity>;
  isRunning: boolean;
  debugMode: boolean;
}

// Create atoms for physics state
export const physicsEngineAtom = atom<PhysicsEngineState | null>(null);
export const physicsDebugModeAtom = atom(
  (get) => get(physicsEngineAtom)?.debugMode || false,
  (get, set, debugMode: boolean) => {
    const physicsEngine = get(physicsEngineAtom);
    if (physicsEngine) {
      set(physicsEngineAtom, {
        ...physicsEngine,
        debugMode,
      });
    }
  }
);

export class PhysicsEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private runner: Matter.Runner;
  private entities: Map<string, PhysicsEntity> = new Map();
  private debugMode = false;
  private updateCallback: ((delta: number) => void) | null = null;

  constructor() {
    // Create a Matter.js engine
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0 }, // No gravity for top-down soccer
    });

    this.world = this.engine.world;

    // Create a runner
    this.runner = Matter.Runner.create({
      delta: 1000 / 60, // 60 FPS
      isFixed: true,
    });

    // Create pitch boundaries
    this.createBoundaries();

    // Set up collision handling
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      this.handleCollisions(event);
    });
  }

  initialize() {
    Matter.Runner.run(this.runner, this.engine);

    // Store state in Jotai atom
    const stateUpdate: PhysicsEngineState = {
      engine: this.engine,
      world: this.world,
      runner: this.runner,
      entities: this.entities,
      isRunning: true,
      debugMode: this.debugMode,
    };

    physicsEngineAtom.onMount = (setAtom) => {
      setAtom(stateUpdate);
      return () => {
        Matter.Runner.stop(this.runner);
        Matter.World.clear(this.world, false);
        Matter.Engine.clear(this.engine);
      };
    };
  }

  // Register callback function for post-physics updates
  setUpdateCallback(callback: (delta: number) => void) {
    this.updateCallback = callback;

    // Set up before update event to call the callback
    Matter.Events.on(this.engine, 'beforeUpdate', () => {
      if (this.updateCallback) {
        // Use the runner's delta or a default value
        const delta = this.runner.delta || 1000 / 60;
        this.updateCallback(delta);
      }
    });
  }

  createBoundaries() {
    // Create top boundary
    const topBoundary = Matter.Bodies.rectangle(PITCH_WIDTH / 2, 0, PITCH_WIDTH, 1, {
      isStatic: true,
      friction: 0.2,
      restitution: 0.8,
    });

    // Create bottom boundary
    const bottomBoundary = Matter.Bodies.rectangle(PITCH_WIDTH / 2, PITCH_HEIGHT, PITCH_WIDTH, 1, {
      isStatic: true,
      friction: 0.2,
      restitution: 0.8,
    });

    // Create left boundary
    const leftBoundary = Matter.Bodies.rectangle(0, PITCH_HEIGHT / 2, 1, PITCH_HEIGHT, {
      isStatic: true,
      friction: 0.2,
      restitution: 0.8,
    });

    // Create right boundary
    const rightBoundary = Matter.Bodies.rectangle(PITCH_WIDTH, PITCH_HEIGHT / 2, 1, PITCH_HEIGHT, {
      isStatic: true,
      friction: 0.2,
      restitution: 0.8,
    });

    // Add boundaries to world
    Matter.Composite.add(this.world, [topBoundary, bottomBoundary, leftBoundary, rightBoundary]);

    // Register boundaries in entities map
    this.entities.set('boundary-top', {
      id: 'boundary-top',
      body: topBoundary,
      type: 'boundary',
    });

    this.entities.set('boundary-bottom', {
      id: 'boundary-bottom',
      body: bottomBoundary,
      type: 'boundary',
    });

    this.entities.set('boundary-left', {
      id: 'boundary-left',
      body: leftBoundary,
      type: 'boundary',
    });

    this.entities.set('boundary-right', {
      id: 'boundary-right',
      body: rightBoundary,
      type: 'boundary',
    });
  }

  createBall(id: string, position: Vector2D, entityRef?: object): PhysicsEntity {
    // Create a ball body
    const ballBody = Matter.Bodies.circle(position.x, position.y, BALL_RADIUS, {
      friction: DEFAULT_FRICTION,
      restitution: DEFAULT_RESTITUTION,
      frictionAir: DEFAULT_AIR_FRICTION,
      density: DEFAULT_DENSITY,
      label: 'ball',
    });

    // Add ball to world
    Matter.Composite.add(this.world, ballBody);

    // Create physics entity
    const ballEntity: PhysicsEntity = {
      id,
      body: ballBody,
      type: 'ball',
      entityRef,
    };

    // Register ball in entities map
    this.entities.set(id, ballEntity);

    return ballEntity;
  }

  createPlayer(id: string, position: Vector2D, entityRef?: object): PhysicsEntity {
    // Create a player body
    const playerBody = Matter.Bodies.circle(position.x, position.y, PLAYER_RADIUS, {
      friction: DEFAULT_FRICTION * 2, // Players have more friction
      restitution: DEFAULT_RESTITUTION * 0.5, // Players have less bounce
      frictionAir: DEFAULT_AIR_FRICTION * 2, // More air resistance for players
      density: DEFAULT_DENSITY * 2, // Players are heavier
      label: 'player',
    });

    // Add player to world
    Matter.Composite.add(this.world, playerBody);

    // Create physics entity
    const playerEntity: PhysicsEntity = {
      id,
      body: playerBody,
      type: 'player',
      entityRef,
    };

    // Register player in entities map
    this.entities.set(id, playerEntity);

    return playerEntity;
  }

  getEntity(id: string): PhysicsEntity | undefined {
    return this.entities.get(id);
  }

  removeEntity(id: string) {
    const entity = this.entities.get(id);
    if (entity) {
      Matter.Composite.remove(this.world, entity.body);
      this.entities.delete(id);
    }
  }

  updateEntityPosition(id: string, position: Vector2D) {
    const entity = this.entities.get(id);
    if (entity) {
      Matter.Body.setPosition(entity.body, {
        x: position.x,
        y: position.y,
      });
    }
  }

  applyForce(id: string, force: Vector2D) {
    const entity = this.entities.get(id);
    if (entity) {
      Matter.Body.applyForce(entity.body, entity.body.position, {
        x: force.x,
        y: force.y,
      });
    }
  }

  setVelocity(id: string, velocity: Vector2D) {
    const entity = this.entities.get(id);
    if (entity) {
      Matter.Body.setVelocity(entity.body, {
        x: velocity.x,
        y: velocity.y,
      });
    }
  }

  getPosition(id: string): Vector2D | null {
    const entity = this.entities.get(id);
    if (entity) {
      return {
        x: entity.body.position.x,
        y: entity.body.position.y,
      };
    }
    return null;
  }

  getVelocity(id: string): Vector2D | null {
    const entity = this.entities.get(id);
    if (entity) {
      return {
        x: entity.body.velocity.x,
        y: entity.body.velocity.y,
      };
    }
    return null;
  }

  pause() {
    Matter.Runner.stop(this.runner);
  }

  resume() {
    Matter.Runner.run(this.runner, this.engine);
  }

  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
  }

  private handleCollisions(event: Matter.IEventCollision<Matter.Engine>) {
    const pairs = event.pairs;

    // Process each collision pair
    for (const pair of pairs) {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      // Handle ball-player collisions
      if (
        (bodyA.label === 'ball' && bodyB.label === 'player') ||
        (bodyA.label === 'player' && bodyB.label === 'ball')
      ) {
        // Handle ball-player collision logic
        const ballBody = bodyA.label === 'ball' ? bodyA : bodyB;
        const playerBody = bodyA.label === 'player' ? bodyA : bodyB;

        // Find entities from bodies
        const ballEntity = Array.from(this.entities.values()).find(
          (entity) => entity.body === ballBody
        );

        const playerEntity = Array.from(this.entities.values()).find(
          (entity) => entity.body === playerBody
        );

        // If both entities found, process collision
        if (ballEntity && playerEntity && ballEntity.entityRef && playerEntity.entityRef) {
          // We could trigger custom collision handling here
          // This would be implemented by the match engine
        }
      }

      // Handle ball-boundary collisions (for out of bounds detection)
      if (
        (bodyA.label === 'ball' && bodyB.label === 'boundary') ||
        (bodyA.label === 'boundary' && bodyB.label === 'ball')
      ) {
        // Handle ball-boundary collision logic
        // This would be used for detecting throw-ins, corners, etc.
      }
    }
  }

  // Rendering utilities for debugging
  renderDebug(ctx: CanvasRenderingContext2D) {
    if (!this.debugMode) return;

    // Render all bodies
    ctx.save();

    // Draw each body
    for (const entity of this.entities.values()) {
      const body = entity.body;

      // Set color based on entity type
      switch (entity.type) {
        case 'ball':
          ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
          break;
        case 'player':
          ctx.fillStyle = 'rgba(0, 0, 255, 0.4)';
          break;
        case 'boundary':
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          break;
      }

      // Draw the body
      ctx.beginPath();

      const vertices = body.vertices;
      ctx.moveTo(vertices[0].x, vertices[0].y);

      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }

      ctx.lineTo(vertices[0].x, vertices[0].y);
      ctx.closePath();
      ctx.fill();

      // Draw center of mass
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, 1, 0, Math.PI * 2);
      ctx.fill();

      // Draw velocity vector
      if (body.speed > 0.1) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.beginPath();
        ctx.moveTo(body.position.x, body.position.y);
        ctx.lineTo(body.position.x + body.velocity.x, body.position.y + body.velocity.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

// Export a singleton instance for easy access
export const physicsEngine = new PhysicsEngine();
