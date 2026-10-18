# game-101

A minimal landscape dot-to-dot game for kids, built with Vite, React, TypeScript, and SVG.

[Play the game](https://hirebarend.github.io/game-101/).

## Run locally

Use Node.js 22.18 or newer.

```sh
npm install
npm run dev
```

To try it on a phone on the same network, run `npm run dev -- --host` and open the printed network URL. Turn the phone sideways to play.

## Play

Press **Play**, then drag continuously from the solid left dot to the ring on the right. Avoid the gray blocks. Touching a block, leaving the board, or lifting early clears the line with no score penalty. Lines may cross themselves.

Each successful connection earns one point and advances automatically. Round one is empty; rounds two and three have one square. Another obstacle is added every two rounds until there are six, after which layouts keep varying. Every layout leaves an open route.

Touch and mouse are supported. Rotating the device or interrupting input clears the current attempt while keeping the score. Reloading starts over. Drawing requires a pointer; keyboard drawing, sound, timers, accounts, and saved progress are intentionally absent.

## Checks

```sh
npm test
npm run build
```

The tests use Node's built-in test runner and cover collision geometry, generated routes, progression, scoring, and interrupted attempts. The production build includes TypeScript checking and writes to `dist/`.

## Deployment

GitHub Pages automatically publishes successful pushes to `main`. The [deployment workflow](https://github.com/hirebarend/game-101/actions/workflows/deploy.yml) installs dependencies, runs tests, builds the game, and deploys `dist/`. You can also trigger it manually from the Actions tab.

The repository's Pages publishing source is **GitHub Actions**. Vite uses `/game-101/` as its base path so assets load at the repository's Pages address. Build output stays out of Git; no custom domain or deployment secret is needed.
