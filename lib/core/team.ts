import type { 
  Vector2D, 
  TeamId, 
  PlayerId, 
  PlayerRole, 
  FormationType, 
  TacticStyle, 
  DefensiveStyle 
} from "../utils/types"
import type { PlayerEntity } from "./player"

export class TeamEntity {
  id: TeamId
  name: string
  color: string
  secondaryColor: string
  players: PlayerEntity[] = []
  formation: FormationType
  tactics: {
    style: TacticStyle
    defensiveStyle: DefensiveStyle
    pressingIntensity: number
    defensiveLineHeight: number
    width: number
    tempo: number
    passingStyle: "short" | "mixed" | "long"
  }
  formationPositions: Record<PlayerId, Vector2D> = {}

  constructor(
    id: TeamId,
    name: string,
    color: string,
    secondaryColor: string,
    formation: FormationType,
    tactics: {
      style: TacticStyle
      defensiveStyle: DefensiveStyle
      pressingIntensity: number
      defensiveLineHeight: number
      width: number
      tempo: number
      passingStyle: "short" | "mixed" | "long"
    },
  ) {
    this.id = id
    this.name = name
    this.color = color
    this.secondaryColor = secondaryColor
    this.formation = formation
    this.tactics = tactics
  }

  addPlayer(player: PlayerEntity): void {
    this.players.push(player)
  }

  getPlayerById(id: PlayerId): PlayerEntity | undefined {
    return this.players.find((p) => p.id === id)
  }

  getRandomPlayer(): PlayerEntity {
    const index = Math.floor(Math.random() * this.players.length)
    return this.players[index]
  }

  getPlayersByRole(role: PlayerRole): PlayerEntity[] {
    return this.players.filter((p) => p.role === role)
  }

  getAvailablePlayers(): PlayerEntity[] {
    return this.players.filter((p) => !p.injured && !p.redCard)
  }

  setupFormation(isHome: boolean): void {
    // Base position is different depending on if it's home or away
    const baseX = isHome ? 30 : 70
    const direction = isHome ? 1 : -1
    const width = this.tactics.width * 0.6 + 5 // Transform width setting to actual width factor (ranges from 5-8)

    // Clear existing formation positions
    this.formationPositions = {}

    // Setup based on formation type
    switch (this.formation) {
      case "4-4-2":
        this.setup442Formation(baseX, direction, width)
        break
      case "4-3-3":
        this.setup433Formation(baseX, direction, width)
        break
      case "4-2-3-1":
        this.setup4231Formation(baseX, direction, width)
        break
      case "3-5-2":
        this.setup352Formation(baseX, direction, width)
        break
      case "5-3-2":
        this.setup532Formation(baseX, direction, width)
        break
    }

    // Apply formation to players
    this.resetPositions()
  }

  setup442Formation(baseX: number, direction: number, width: number): void {
    const players = this.getAvailablePlayers()
    const goalkeeper = players.find((p) => p.role === "GK")
    const defenders = players.filter((p) => p.role === "DEF").slice(0, 4)
    const midfielders = players.filter((p) => p.role === "MID").slice(0, 4)
    const forwards = players.filter((p) => p.role === "FWD").slice(0, 2)

    if (goalkeeper) {
      this.formationPositions[goalkeeper.id] = { x: baseX - 20 * direction, y: 50 }
    }

    // Setup defenders
    if (defenders.length >= 4) {
      this.formationPositions[defenders[0].id] = { x: baseX - 10 * direction, y: 20 }
      this.formationPositions[defenders[1].id] = { x: baseX - 10 * direction, y: 40 }
      this.formationPositions[defenders[2].id] = { x: baseX - 10 * direction, y: 60 }
      this.formationPositions[defenders[3].id] = { x: baseX - 10 * direction, y: 80 }
    }

    // Setup midfielders
    if (midfielders.length >= 4) {
      this.formationPositions[midfielders[0].id] = { x: baseX, y: 20 }
      this.formationPositions[midfielders[1].id] = { x: baseX, y: 40 }
      this.formationPositions[midfielders[2].id] = { x: baseX, y: 60 }
      this.formationPositions[midfielders[3].id] = { x: baseX, y: 80 }
    }

    // Setup forwards
    if (forwards.length >= 2) {
      this.formationPositions[forwards[0].id] = { x: baseX + 15 * direction, y: 35 }
      this.formationPositions[forwards[1].id] = { x: baseX + 15 * direction, y: 65 }
    }

    // Apply width factor
    this.adjustFormationWidth(width)
  }

  setup433Formation(baseX: number, direction: number, width: number): void {
    const players = this.getAvailablePlayers()
    const goalkeeper = players.find((p) => p.role === "GK")
    const defenders = players.filter((p) => p.role === "DEF").slice(0, 4)
    const midfielders = players.filter((p) => p.role === "MID").slice(0, 3)
    const forwards = players.filter((p) => p.role === "FWD").slice(0, 3)

    if (goalkeeper) {
      this.formationPositions[goalkeeper.id] = { x: baseX - 20 * direction, y: 50 }
    }

    // Setup defenders
    if (defenders.length >= 4) {
      this.formationPositions[defenders[0].id] = { x: baseX - 10 * direction, y: 20 }
      this.formationPositions[defenders[1].id] = { x: baseX - 10 * direction, y: 40 }
      this.formationPositions[defenders[2].id] = { x: baseX - 10 * direction, y: 60 }
      this.formationPositions[defenders[3].id] = { x: baseX - 10 * direction, y: 80 }
    }

    // Setup midfielders
    if (midfielders.length >= 3) {
      this.formationPositions[midfielders[0].id] = { x: baseX, y: 30 }
      this.formationPositions[midfielders[1].id] = { x: baseX, y: 50 }
      this.formationPositions[midfielders[2].id] = { x: baseX, y: 70 }
    }

    // Setup forwards
    if (forwards.length >= 3) {
      this.formationPositions[forwards[0].id] = { x: baseX + 15 * direction, y: 25 }
      this.formationPositions[forwards[1].id] = { x: baseX + 15 * direction, y: 50 }
      this.formationPositions[forwards[2].id] = { x: baseX + 15 * direction, y: 75 }
    }

    // Apply width factor
    this.adjustFormationWidth(width)
  }

  setup4231Formation(baseX: number, direction: number, width: number): void {
    const players = this.getAvailablePlayers()
    const goalkeeper = players.find((p) => p.role === "GK")
    const defenders = players.filter((p) => p.role === "DEF").slice(0, 4)
    const midfielders = players.filter((p) => p.role === "MID").slice(0, 5)
    const forwards = players.filter((p) => p.role === "FWD").slice(0, 1)

    if (goalkeeper) {
      this.formationPositions[goalkeeper.id] = { x: baseX - 20 * direction, y: 50 }
    }

    // Setup defenders
    if (defenders.length >= 4) {
      this.formationPositions[defenders[0].id] = { x: baseX - 10 * direction, y: 20 }
      this.formationPositions[defenders[1].id] = { x: baseX - 10 * direction, y: 40 }
      this.formationPositions[defenders[2].id] = { x: baseX - 10 * direction, y: 60 }
      this.formationPositions[defenders[3].id] = { x: baseX - 10 * direction, y: 80 }
    }

    // Setup defensive midfielders
    if (midfielders.length >= 2) {
      this.formationPositions[midfielders[0].id] = { x: baseX - 5 * direction, y: 35 }
      this.formationPositions[midfielders[1].id] = { x: baseX - 5 * direction, y: 65 }
    }

    // Setup attacking midfielders
    if (midfielders.length >= 5) {
      this.formationPositions[midfielders[2].id] = { x: baseX + 5 * direction, y: 30 }
      this.formationPositions[midfielders[3].id] = { x: baseX + 5 * direction, y: 50 }
      this.formationPositions[midfielders[4].id] = { x: baseX + 5 * direction, y: 70 }
    }

    // Setup forwards
    if (forwards.length >= 1) {
      this.formationPositions[forwards[0].id] = { x: baseX + 15 * direction, y: 50 }
    }

    // Apply width factor
    this.adjustFormationWidth(width)
  }

  setup352Formation(baseX: number, direction: number, width: number): void {
    const players = this.getAvailablePlayers()
    const goalkeeper = players.find((p) => p.role === "GK")
    const defenders = players.filter((p) => p.role === "DEF").slice(0, 3)
    const midfielders = players.filter((p) => p.role === "MID").slice(0, 5)
    const forwards = players.filter((p) => p.role === "FWD").slice(0, 2)

    if (goalkeeper) {
      this.formationPositions[goalkeeper.id] = { x: baseX - 20 * direction, y: 50 }
    }

    // Setup defenders
    if (defenders.length >= 3) {
      this.formationPositions[defenders[0].id] = { x: baseX - 10 * direction, y: 30 }
      this.formationPositions[defenders[1].id] = { x: baseX - 10 * direction, y: 50 }
      this.formationPositions[defenders[2].id] = { x: baseX - 10 * direction, y: 70 }
    }

    // Setup midfielders
    if (midfielders.length >= 5) {
      // Wing backs
      this.formationPositions[midfielders[0].id] = { x: baseX - 5 * direction, y: 15 }
      this.formationPositions[midfielders[1].id] = { x: baseX - 5 * direction, y: 85 }

      // Central midfielders
      this.formationPositions[midfielders[2].id] = { x: baseX, y: 30 }
      this.formationPositions[midfielders[3].id] = { x: baseX, y: 50 }
      this.formationPositions[midfielders[4].id] = { x: baseX, y: 70 }
    }

    // Setup forwards
    if (forwards.length >= 2) {
      this.formationPositions[forwards[0].id] = { x: baseX + 15 * direction, y: 35 }
      this.formationPositions[forwards[1].id] = { x: baseX + 15 * direction, y: 65 }
    }

    // Apply width factor
    this.adjustFormationWidth(width)
  }

  setup532Formation(baseX: number, direction: number, width: number): void {
    const players = this.getAvailablePlayers()
    const goalkeeper = players.find((p) => p.role === "GK")
    const defenders = players.filter((p) => p.role === "DEF").slice(0, 5)
    const midfielders = players.filter((p) => p.role === "MID").slice(0, 3)
    const forwards = players.filter((p) => p.role === "FWD").slice(0, 2)

    if (goalkeeper) {
      this.formationPositions[goalkeeper.id] = { x: baseX - 20 * direction, y: 50 }
    }

    // Setup defenders
    if (defenders.length >= 5) {
      // Central defenders
      this.formationPositions[defenders[0].id] = { x: baseX - 10 * direction, y: 30 }
      this.formationPositions[defenders[1].id] = { x: baseX - 10 * direction, y: 50 }
      this.formationPositions[defenders[2].id] = { x: baseX - 10 * direction, y: 70 }

      // Wing backs
      this.formationPositions[defenders[3].id] = { x: baseX - 5 * direction, y: 15 }
      this.formationPositions[defenders[4].id] = { x: baseX - 5 * direction, y: 85 }
    }

    // Setup midfielders
    if (midfielders.length >= 3) {
      this.formationPositions[midfielders[0].id] = { x: baseX, y: 30 }
      this.formationPositions[midfielders[1].id] = { x: baseX, y: 50 }
      this.formationPositions[midfielders[2].id] = { x: baseX, y: 70 }
    }

    // Setup forwards
    if (forwards.length >= 2) {
      this.formationPositions[forwards[0].id] = { x: baseX + 15 * direction, y: 35 }
      this.formationPositions[forwards[1].id] = { x: baseX + 15 * direction, y: 65 }
    }

    // Apply width factor
    this.adjustFormationWidth(width)
  }

  resetPositions(): void {
    for (const player of this.players) {
      const formationPosition = this.formationPositions[player.id]
      if (formationPosition) {
        player.position = { ...formationPosition }
        player.targetPosition = { ...formationPosition }
      }
    }
  }

  private adjustFormationWidth(widthFactor: number): void {
    // Center of the field is at y=50
    const center = 50
    
    for (const playerId in this.formationPositions) {
      const pos = this.formationPositions[playerId]
      
      // Adjust y-position based on width factor
      // Players further from center get pushed outward more
      const distanceFromCenter = pos.y - center
      const adjustment = distanceFromCenter * (widthFactor / 5) // normalized by 5
      
      // Apply adjustment
      pos.y = center + adjustment
      
      // Ensure player stays on the field
      pos.y = Math.max(5, Math.min(95, pos.y))
    }
  }

  updateTactics(
    style: TacticStyle,
    defensiveStyle: DefensiveStyle,
    pressingIntensity: number,
    defensiveLineHeight: number,
    width: number,
    tempo: number,
    passingStyle: "short" | "mixed" | "long",
  ): void {
    this.tactics = {
      style,
      defensiveStyle,
      pressingIntensity,
      defensiveLineHeight,
      width,
      tempo,
      passingStyle,
    }

    // Re-apply formation with new width
    this.setupFormation(this.formationPositions[this.players[0].id].x < 50)
  }

  changeFormation(formation: FormationType, isHome: boolean): void {
    this.formation = formation
    this.setupFormation(isHome)
  }
}
