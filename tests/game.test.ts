import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BOARD, GOAL, HIT_RADIUS, LINE_WIDTH, START,
  createGame, gameReducer, generateObstacles, hitsObstacle,
} from '../src/game.ts'
import type { Game, Obstacle, Point } from '../src/game.ts'

function begin(obstacles: Obstacle[] = []): Game {
  const ready = gameReducer(createGame(), { type: 'play' })
  return gameReducer({ ...ready, obstacles }, { type: 'begin', point: START, pointerId: 1 })
}

function move(game: Game, point: Point, pointerId = 1) {
  return gameReducer(game, { type: 'move', point, pointerId })
}

test('starts without obstacles and caps progression at six', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 10, 11, 12, 13, 1000].map((round) => generateObstacles(round).length),
    [0, 1, 1, 2, 2, 5, 5, 6, 6, 6])
  const square = generateObstacles(2)[0]
  assert.equal(square.width, square.height)
})

test('every generated layout has generous corridors and a traversable route', () => {
  let seed = 17
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 2 ** 32
  }
  for (let round = 1; round <= 300; round++) {
    const obstacles = generateObstacles(round, random)
    let game = begin(obstacles)
    for (let i = 0; i < obstacles.length; i++) {
      const block = obstacles[i]
      assert.ok(block.x > START.x + HIT_RADIUS)
      assert.ok(block.x + block.width < GOAL.x - HIT_RADIUS)
      assert.ok(block.y >= 0 && block.y + block.height <= BOARD.height)
      assert.ok(BOARD.height - block.height >= 180)
      const previous = obstacles[i - 1]
      const left = previous ? previous.x + previous.width : START.x
      const gap = block.x - left
      assert.ok(gap - LINE_WIDTH >= 68)
      const bendX = (left + block.x) / 2
      const passY = block.y === 0 ? 340 : 80
      const last = game.path[game.path.length - 1]
      game = move(game, { x: bendX, y: last.y })
      game = move(game, { x: bendX, y: passY })
      game = move(game, { x: block.x + block.width + 10, y: passY })
      assert.equal(game.phase, 'drawing', `round ${round}, block ${i}`)
    }
    game = move(game, { x: 880, y: game.path[game.path.length - 1].y })
    game = move(game, { x: 880, y: GOAL.y })
    game = move(game, GOAL)
    assert.equal(game.phase, 'success', `round ${round}`)
  }
})

test('collision includes edges, line thickness, corners, and skipped pointer samples', () => {
  const block = { x: 100, y: 100, width: 50, height: 50 }
  assert.equal(hitsObstacle({ x: 0, y: 120 }, { x: 200, y: 120 }, block), true)
  assert.equal(hitsObstacle({ x: 200, y: 120 }, { x: 0, y: 120 }, block), true)
  assert.equal(hitsObstacle({ x: 0, y: 96 }, { x: 200, y: 96 }, block), true)
  assert.equal(hitsObstacle({ x: 0, y: 95 }, { x: 200, y: 95 }, block), false)
  assert.equal(hitsObstacle({ x: 96, y: 0 }, { x: 96, y: 200 }, block), true)
  assert.equal(hitsObstacle({ x: 0, y: 0 }, { x: 96, y: 96 }, block), true)
  assert.equal(hitsObstacle({ x: 120, y: 120 }, { x: 120, y: 120 }, block), true)
  assert.equal(hitsObstacle({ x: 200, y: 200 }, { x: 200, y: 200 }, block), false)
})

test('reaching or crossing the goal scores immediately and only once', () => {
  for (const target of [GOAL, { x: 1100, y: GOAL.y }, { x: GOAL.x, y: GOAL.y + HIT_RADIUS }]) {
    const game = move(begin(), target)
    assert.equal(game.phase, 'success')
    assert.equal(game.score, 1)
    assert.equal(move(game, GOAL).score, 1)
    assert.equal(gameReducer(game, { type: 'cancel', pointerId: 1 }).phase, 'success')
    const next = gameReducer(game, { type: 'next', obstacles: generateObstacles(2) })
    assert.equal(next.phase, 'ready')
    assert.equal(next.score, 1)
    assert.equal(next.obstacles.length, 1)
    assert.deepEqual(next.path, [])
  }
})

test('a fast swipe through an obstacle cannot win', () => {
  const game = move(begin(generateObstacles(2)), GOAL)
  assert.equal(game.phase, 'ready')
  assert.equal(game.score, 0)
  assert.equal(game.retry, true)
  assert.deepEqual(game.path, [])
})

test('release, cancellation, and leaving any board edge clear only the attempt', () => {
  const drawing = { ...begin(), score: 5 }
  const outcomes = [
    gameReducer(drawing, { type: 'cancel' }),
    gameReducer(drawing, { type: 'cancel', pointerId: 1 }),
    ...[{ x: -1, y: 210 }, { x: 1001, y: 0 }, { x: 60, y: -1 }, { x: 60, y: 421 }]
      .map((point) => move(drawing, point)),
  ]
  for (const result of outcomes) {
    assert.equal(result.phase, 'ready')
    assert.equal(result.score, 5)
    assert.deepEqual(result.path, [])
    assert.equal(result.pointerId, null)
    assert.equal(result.obstacles, drawing.obstacles)
  }
})

test('extra pointers and starting away from the start dot do nothing', () => {
  const ready = gameReducer(createGame(), { type: 'play' })
  assert.equal(gameReducer(ready, { type: 'begin', point: GOAL, pointerId: 1 }), ready)
  const drawing = begin()
  assert.equal(move(drawing, GOAL, 2), drawing)
  assert.equal(gameReducer(drawing, { type: 'cancel', pointerId: 2 }), drawing)
  assert.equal(gameReducer(drawing, { type: 'begin', point: START, pointerId: 2 }), drawing)
})

test('self-crossing is allowed and a fresh game never retains progress', () => {
  let game = begin()
  for (const point of [{ x: 250, y: 100 }, { x: 250, y: 300 }, { x: 150, y: 100 }, GOAL]) {
    game = move(game, point)
  }
  assert.equal(game.phase, 'success')
  assert.equal(createGame().score, 0)
})
