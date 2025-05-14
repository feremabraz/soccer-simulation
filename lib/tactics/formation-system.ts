import type { TeamEntity } from "../core/team"
import type { FormationType, Vector2D } from "../utils/types"

export class FormationSystem {
  changeFormation(team: TeamEntity, newFormation: FormationType, isHome: boolean): void {
    team.changeFormation(newFormation, isHome)
  }

  suggestFormationChange(
    team: TeamEntity,
    isHome: boolean,
    score: { home: number; away: number },
    gameTime: number,
  ): FormationType | null {
    const isWinning = (isHome && score.home > score.away) || (!isHome && score.away > score.home)
    const isLosing = (isHome && score.home < score.away) || (!isHome && score.away < score.home)
    const scoreDifference = Math.abs(score.home - score.away)
    const isLateGame = gameTime > 70 // After 70 minutes

    const currentFormation = team.formation

    // Don't change formation too often
    if (Math.random() > 0.2) return null

    // Losing by 2+ goals late in the game - go attacking
    if (isLosing && scoreDifference >= 2 && isLateGame) {
      if (currentFormation !== "4-3-3" && currentFormation !== "3-5-2") {
        return Math.random() > 0.5 ? "4-3-3" : "3-5-2"
      }
    }

    // Winning late in the game - go defensive
    if (isWinning && isLateGame) {
      if (currentFormation !== "5-3-2" && currentFormation !== "4-5-1") {
        return "5-3-2"
      }
    }

    // Tied late in the game - balanced approach
    if (!isWinning && !isLosing && isLateGame) {
      if (currentFormation !== "4-4-2" && currentFormation !== "4-2-3-1") {
        return "4-2-3-1"
      }
    }

    return null
  }

  // Get formation visualization data
  getFormationVisualization(formation: FormationType): { x: number; y: number; role: string }[] {
    const positions: { x: number; y: number; role: string }[] = []

    // Add goalkeeper
    positions.push({ x: 10, y: 50, role: "GK" })

    switch (formation) {
      case "4-4-2":
        // Defenders
        positions.push({ x: 20, y: 20, role: "DEF" })
        positions.push({ x: 20, y: 40, role: "DEF" })
        positions.push({ x: 20, y: 60, role: "DEF" })
        positions.push({ x: 20, y: 80, role: "DEF" })

        // Midfielders
        positions.push({ x: 40, y: 20, role: "MID" })
        positions.push({ x: 40, y: 40, role: "MID" })
        positions.push({ x: 40, y: 60, role: "MID" })
        positions.push({ x: 40, y: 80, role: "MID" })

        // Forwards
        positions.push({ x: 60, y: 35, role: "FWD" })
        positions.push({ x: 60, y: 65, role: "FWD" })
        break

      case "4-3-3":
        // Defenders
        positions.push({ x: 20, y: 20, role: "DEF" })
        positions.push({ x: 20, y: 40, role: "DEF" })
        positions.push({ x: 20, y: 60, role: "DEF" })
        positions.push({ x: 20, y: 80, role: "DEF" })

        // Midfielders
        positions.push({ x: 40, y: 30, role: "MID" })
        positions.push({ x: 40, y: 50, role: "MID" })
        positions.push({ x: 40, y: 70, role: "MID" })

        // Forwards
        positions.push({ x: 60, y: 25, role: "FWD" })
        positions.push({ x: 60, y: 50, role: "FWD" })
        positions.push({ x: 60, y: 75, role: "FWD" })
        break

      case "4-2-3-1":
        // Defenders
        positions.push({ x: 20, y: 20, role: "DEF" })
        positions.push({ x: 20, y: 40, role: "DEF" })
        positions.push({ x: 20, y: 60, role: "DEF" })
        positions.push({ x: 20, y: 80, role: "DEF" })

        // Defensive Midfielders
        positions.push({ x: 35, y: 35, role: "MID" })
        positions.push({ x: 35, y: 65, role: "MID" })

        // Attacking Midfielders
        positions.push({ x: 50, y: 25, role: "MID" })
        positions.push({ x: 50, y: 50, role: "MID" })
        positions.push({ x: 50, y: 75, role: "MID" })

        // Forward
        positions.push({ x: 65, y: 50, role: "FWD" })
        break

      case "3-5-2":
        // Defenders
        positions.push({ x: 20, y: 30, role: "DEF" })
        positions.push({ x: 20, y: 50, role: "DEF" })
        positions.push({ x: 20, y: 70, role: "DEF" })

        // Midfielders
        positions.push({ x: 35, y: 15, role: "MID" }) // Wing back
        positions.push({ x: 40, y: 30, role: "MID" })
        positions.push({ x: 40, y: 50, role: "MID" })
        positions.push({ x: 40, y: 70, role: "MID" })
        positions.push({ x: 35, y: 85, role: "MID" }) // Wing back

        // Forwards
        positions.push({ x: 60, y: 35, role: "FWD" })
        positions.push({ x: 60, y: 65, role: "FWD" })
        break

      case "5-3-2":
        // Defenders
        positions.push({ x: 20, y: 20, role: "DEF" })
        positions.push({ x: 20, y: 35, role: "DEF" })
        positions.push({ x: 20, y: 50, role: "DEF" })
        positions.push({ x: 20, y: 65, role: "DEF" })
        positions.push({ x: 20, y: 80, role: "DEF" })

        // Midfielders
        positions.push({ x: 40, y: 30, role: "MID" })
        positions.push({ x: 40, y: 50, role: "MID" })
        positions.push({ x: 40, y: 70, role: "MID" })

        // Forwards
        positions.push({ x: 60, y: 35, role: "FWD" })
        positions.push({ x: 60, y: 65, role: "FWD" })
        break
        
      case "4-5-1":
        // Defenders
        positions.push({ x: 20, y: 20, role: "DEF" })
        positions.push({ x: 20, y: 40, role: "DEF" })
        positions.push({ x: 20, y: 60, role: "DEF" })
        positions.push({ x: 20, y: 80, role: "DEF" })

        // Midfielders
        positions.push({ x: 40, y: 15, role: "MID" })
        positions.push({ x: 40, y: 30, role: "MID" })
        positions.push({ x: 40, y: 50, role: "MID" })
        positions.push({ x: 40, y: 70, role: "MID" })
        positions.push({ x: 40, y: 85, role: "MID" })

        // Forward
        positions.push({ x: 60, y: 50, role: "FWD" })
        break
    }

    return positions
  }
}

export const formationSystem = new FormationSystem()
