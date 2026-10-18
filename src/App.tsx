import { useEffect, useReducer, useSyncExternalStore } from 'react'
import type { PointerEvent } from 'react'
import {
  BOARD, DOT_RADIUS, GOAL, HIT_RADIUS, LINE_WIDTH, START,
  createGame, generateObstacles, gameReducer, near,
} from './game'

const portraitQuery = '(orientation: portrait)'

function subscribeToOrientation(callback: () => void) {
  const query = window.matchMedia(portraitQuery)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function App() {
  const [game, dispatch] = useReducer(gameReducer, undefined, createGame)
  const portrait = useSyncExternalStore(
    subscribeToOrientation,
    () => window.matchMedia(portraitQuery).matches,
  )

  useEffect(() => {
    const cancel = () => dispatch({ type: 'cancel' })
    window.addEventListener('resize', cancel)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', cancel)
    return () => {
      window.removeEventListener('resize', cancel)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', cancel)
    }
  }, [])

  useEffect(() => {
    if (game.phase !== 'success' || portrait) return
    const timeout = window.setTimeout(() => dispatch({
      type: 'next',
      obstacles: generateObstacles(game.score + 1),
    }), 700)
    return () => window.clearTimeout(timeout)
  }, [game.phase, game.score, portrait])

  function pointFromEvent(event: PointerEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM()
    if (!matrix) return null
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return { x: point.x, y: point.y }
  }

  function startDrawing(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || event.button !== 0 || game.phase !== 'ready') return
    const point = pointFromEvent(event)
    if (!point || !near(point, START, HIT_RADIUS)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dispatch({ type: 'begin', point, pointerId: event.pointerId })
  }

  function moveDrawing(event: PointerEvent<SVGSVGElement>) {
    const point = pointFromEvent(event)
    if (point) dispatch({ type: 'move', point, pointerId: event.pointerId })
  }

  function finishDrawing(event: PointerEvent<SVGSVGElement>) {
    moveDrawing(event)
    dispatch({ type: 'cancel', pointerId: event.pointerId })
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <main className="app">
      {portrait ? (
        <section className="welcome" aria-labelledby="rotate-title">
          <svg className="rotate-icon" viewBox="0 0 80 80" aria-hidden="true">
            <rect x="13" y="23" width="54" height="34" rx="6" />
            <path d="M34 10a30 30 0 0 1 36 22m0-12v12H58M46 70a30 30 0 0 1-36-22m0 12V48h12" />
          </svg>
          <h1 id="rotate-title">Turn your phone</h1>
          <p>This little game plays sideways.</p>
        </section>
      ) : game.phase === 'start' ? (
        <section className="welcome" aria-labelledby="title">
          <svg className="welcome-dots" viewBox="0 0 240 64" aria-hidden="true">
            <path d="M32 32h176" strokeDasharray="3 9" />
            <circle className="start-dot" cx="32" cy="32" r="18" />
            <circle className="goal-dot" cx="208" cy="32" r="18" />
          </svg>
          <h1 id="title">Connect the dots</h1>
          <p>Drag from one dot to the other.</p>
          <button onClick={() => dispatch({ type: 'play' })}>Play</button>
        </section>
      ) : (
        <div className="game">
          <header>
            <span className="game-title">Connect the dots</span>
            <span className="score" aria-label={`Score: ${game.score}`}>
              <span>Score</span> <strong>{game.score}</strong>
            </span>
          </header>
          <div className="board-area">
            <svg
              className={`board${game.phase === 'success' ? ' is-success' : ''}`}
              viewBox={`0 0 ${BOARD.width} ${BOARD.height}`}
              role="img"
              aria-labelledby="board-title board-description"
              onPointerDown={startDrawing}
              onPointerMove={moveDrawing}
              onPointerUp={finishDrawing}
              onPointerCancel={(event) => dispatch({ type: 'cancel', pointerId: event.pointerId })}
              onLostPointerCapture={(event) => dispatch({ type: 'cancel', pointerId: event.pointerId })}
              onContextMenu={(event) => event.preventDefault()}
            >
              <title id="board-title">Round {game.score + (game.phase === 'success' ? 0 : 1)}</title>
              <desc id="board-description">Drag from the solid left dot to the ring on the right. Avoid the gray blocks.</desc>
              <rect className="board-background" width={BOARD.width} height={BOARD.height} rx="12" />
              {game.obstacles.map((obstacle, index) => (
                <rect className="obstacle" key={index} {...obstacle} />
              ))}
              {game.path.length > 0 && (
                <polyline
                  className="drawn-line"
                  points={game.path.map(({ x, y }) => `${x},${y}`).join(' ')}
                  strokeWidth={LINE_WIDTH}
                />
              )}
              <circle className="start-dot" cx={START.x} cy={START.y} r={DOT_RADIUS} />
              <circle className="goal-dot" cx={GOAL.x} cy={GOAL.y} r={DOT_RADIUS} />
              <circle className="touch-target" cx={START.x} cy={START.y} r={HIT_RADIUS} />
              <circle className="touch-target" cx={GOAL.x} cy={GOAL.y} r={HIT_RADIUS} />
            </svg>
          </div>
          <p className="hint" role="status" aria-live="polite">
            {game.phase === 'success' ? 'You did it!' : game.retry
              ? 'Try again. You’ve got this.' : 'Start at the solid dot. Find your way to the ring.'}
          </p>
        </div>
      )}
    </main>
  )
}

export default App
