# State and callbacks

visiojs initializes with:
```js
const vjs = visiojs({
  initialState,   // required
  stateChanged,   // optional callback
});
```

This page describes the shape of `initialState` and how `stateChanged` works.

## initialState

An object that fully describes the canvas. Minimal example:
```js
const initialState = {
  settings: {
    gridSize: 32,
    width: 2432,
    height: 1792,
    defaultZoom: 0.75,
    maxZoom: 2,
  },
  shapes: [
    {
      image: "resistor.svg",
      x: 64,
      y: -64,
      connectors: [[-32, 0], [64, 0]],
      label: { text: "R0", class: "circuit_label", x: 16, y: -36 },
      // optional:
      // width: 100,
      // height: 100,
      // rotation: 0,
      // fixed: true,      // set true to prevent dragging
      // offset: [-48, -48]
    },
    // more shapes or null placeholders…
  ],
  wires: [
    {
      start: { shapeID: 4, connectorID: 1 },
      end:   { shapeID: 3, connectorID: 1 },
      points: [[192, -64]],  // optional mid/elbow points in canvas coords
    },
    // more wires or null placeholders…
  ],
};
```

Notes and invariants:
- settings
  - Omit any field to accept defaults:
    - gridSize: 16
    - width: 2432
    - height: 1792
    - defaultZoom: 1
    - maxZoom: 2
- shapes: Array<(Shape|null)>
  - Each shape’s index in this array is its shapeID.
  - Deletions leave a null entry. New shapes may fill the first null or append.
  - Shape fields:
    - image: string. Path/URL to the visual asset (typically an SVG).
    - x, y: number. Canvas coordinates (snapped to grid when moved).
    - connectors?: Array<[x, y]>. Connector locations relative to the shape’s local origin before rotation.
    - label?: { text: string, class?: string, x: number, y: number }.
    - rotation?: number (degrees).
    - fixed?: boolean. Set true to make the shape non-draggable.
    - offset?: [dx, dy]. Fine alignment for the asset; used by bundled examples.
- wires: Array<(Wire|null)>
  - Each wire connects a start and end connector:
    - start: { shapeID: number, connectorID: number }
    - end: { shapeID: number, connectorID: number }
  - points?: Array<[x, y]> midpoints (elbows) in canvas coordinates. Can be empty for a straight connection.
  - Deletions leave a null entry.

Tip: Keep shapeID/connectorID consistent. connectorID is the index within that shape’s connectors array.

## stateChanged(state)

Optional callback invoked whenever visiojs mutates the state, for example:
- After adding a shape
- After finishing a drag/move of a shape
- After creating a wire or moving a wire elbow
- After deleting a selected shape or wire

Signature:
```js
function stateChanged(state) { /* ... */ }
```

Important behavior:
- The `state` object is the live, already-mutated in-memory state used by visiojs.
- If you keep history or need immutability, deep-clone before storing.

Example (vanilla) history tracker:
```js
const numUndos = 15;
let history = { pointer: 0, state: [] };

function trackHistory(newState) {
  const deepCopy = JSON.parse(JSON.stringify(newState));
  const h = { ...history };
  // If we branched (undid, then edited), drop future
  if (h.pointer < h.state.length - 1) h.state = h.state.slice(0, h.pointer + 1);
  // Maintain a bounded history
  if (h.state.length === numUndos) h.state = [...h.state.slice(1), deepCopy];
  else h.state = [...h.state, deepCopy];
  h.pointer = h.state.length - 1;
  history = h;
}

const vjs = visiojs({
  initialState,
  stateChanged: trackHistory,
});
```

Undo/redo with redraw:
```js
function undo() {
  if (history.pointer === 0) return;
  vjs.redraw(history.state[history.pointer - 1]);
  history = { ...history, pointer: history.pointer - 1 };
}

function redo() {
  if (history.pointer >= history.state.length - 1) return;
  vjs.redraw(history.state[history.pointer + 1]);
  history = { ...history, pointer: history.pointer + 1 };
}
```

Notes:
- vjs.redraw expects a full state object with `shapes` and `wires`. It updates geometry; it does not change `settings`.
- Coordinates are in canvas space; snapping is controlled by `settings.gridSize`.
- For concrete, runnable examples, see:
  - Vanilla: examples/circuit_vanilla/index.js
  - React: examples/circuit_react/src/App.jsx