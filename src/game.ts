export type Point = { x: number; y: number }
export type Obstacle = Point & { width: number; height: number }

export const BOARD = { width: 1000, height: 420 }
export const START: Point = { x: 60, y: 210 }
export const GOAL: Point = { x: 940, y: 210 }
export const DOT_RADIUS = 24
export const HIT_RADIUS = 44
export const LINE_WIDTH = 8

export function near(a: Point, b: Point, radius: number) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= radius
}

export function generateObstacles(round: number, random = Math.random): Obstacle[] {
  const count = Math.min(6, Math.floor(round / 2))
  if (count === 0) return []
  // The first obstacle is a simple square with room to pass on either side.
  if (count === 1) return [{ x: 452, y: 162, width: 96, height: 96 }]
  const topFirst = random() < 0.5
  return Array.from({ length: count }, (_, index) => {
    const width = 32 + random() * 8
    const height = 215 + random() * 20
    return {
      x: 210 + index * (580 / (count - 1)) - width / 2,
      y: (index % 2 === 0) === topFirst ? 0 : BOARD.height - height,
      width,
      height,
    }
  })
}

export function hitsObstacle(from: Point, to: Point, obstacle: Obstacle) {
  const padding = LINE_WIDTH / 2
  let enter = 0
  let exit = 1
  for (const axis of ['x', 'y'] as const) {
    const min = obstacle[axis] - padding
    const max = obstacle[axis] + obstacle[axis === 'x' ? 'width' : 'height'] + padding
    const delta = to[axis] - from[axis]
    if (delta === 0) {
      if (from[axis] < min || from[axis] > max) return false
    } else {
      const a = (min - from[axis]) / delta
      const b = (max - from[axis]) / delta
      enter = Math.max(enter, Math.min(a, b))
      exit = Math.min(exit, Math.max(a, b))
      if (enter > exit) return false
    }
  }
  return true
}

function goalEntry(from: Point, to: Point): Point | null {
  if (near(from, GOAL, HIT_RADIUS)) return from
  const dx = to.x - from.x
  const dy = to.y - from.y
  const ox = from.x - GOAL.x
  const oy = from.y - GOAL.y
  const a = dx * dx + dy * dy
  if (a === 0) return null
  const b = 2 * (ox * dx + oy * dy)
  const c = ox * ox + oy * oy - HIT_RADIUS * HIT_RADIUS
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return null
  const t = (-b - Math.sqrt(discriminant)) / (2 * a)
  return t >= 0 && t <= 1 ? { x: from.x + t * dx, y: from.y + t * dy } : null
}

export type Game = {
  phase: 'start' | 'ready' | 'drawing' | 'success'
  score: number
  obstacles: Obstacle[]
  path: Point[]
  pointerId: number | null
  retry: boolean
}

type Action =
  | { type: 'play' }
  | { type: 'begin' | 'move'; point: Point; pointerId: number }
  | { type: 'cancel'; pointerId?: number }
  | { type: 'next'; obstacles: Obstacle[] }

export function createGame(): Game {
  return { phase: 'start', score: 0, obstacles: [], path: [], pointerId: null, retry: false }
}

function retry(game: Game): Game {
  return { ...game, phase: 'ready', path: [], pointerId: null, retry: true }
}

export function gameReducer(game: Game, action: Action): Game {
  switch (action.type) {
    case 'play':
      return game.phase === 'start' ? { ...game, phase: 'ready' } : game
    case 'begin':
      if (game.phase !== 'ready' || !near(action.point, START, HIT_RADIUS)) return game
      return { ...game, phase: 'drawing', path: [START, action.point], pointerId: action.pointerId, retry: false }
    case 'cancel':
      return game.phase === 'drawing' && (action.pointerId === undefined || action.pointerId === game.pointerId)
        ? retry(game) : game
    case 'next':
      return game.phase === 'success'
        ? { ...game, phase: 'ready', path: [], obstacles: action.obstacles, retry: false } : game
    case 'move': {
      if (game.phase !== 'drawing' || action.pointerId !== game.pointerId) return game
      const from = game.path[game.path.length - 1]
      const arrival = goalEntry(from, action.point)
      const to = arrival ?? action.point
      if (to.x < 0 || to.x > BOARD.width || to.y < 0 || to.y > BOARD.height
        || game.obstacles.some((obstacle) => hitsObstacle(from, to, obstacle))) return retry(game)
      if (arrival) {
        return { ...game, phase: 'success', score: game.score + 1,
          path: [...game.path, arrival, GOAL], pointerId: null }
      }
      if (near(from, to, 1)) return game
      return { ...game, path: [...game.path, to] }
    }
  }
}
