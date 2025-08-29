# Usage

This guide highlights the most common patterns. For full working code, see the examples linked below.

## Importing the library and styles
```js
import visiojs from 'visiojs';
import 'visiojs/dist/visiojs.css';
```

## Rendering and interaction
visiojs renders interactive SVG-based diagrams in the browser. Use the examples to see how to:
- Initialize a canvas/board
- Add shapes and connectors
- Drag, connect, and edit elements
- Snap to grid

Examples:
- React: https://github.com/28raining/visiojs/tree/main/examples/circuit_react
- Vanilla: https://github.com/28raining/visiojs/tree/main/examples/circuit_vanilla

## State: save, load, undo/redo
The entire diagram state is JSON, which makes it easy to:
- Save/load diagrams
- Implement undo/redo
- Manipulate or migrate data

Refer to the example projects to see how state is read and applied.

## Customizing the look with CSS
visiojs provides default styles in `visiojs/dist/visiojs.css`. You can override classes to change:
- Colors, stroke widths, fonts
- Grid appearance (including hiding it)
- Hover/selected states

Tip: Import the default CSS, then override selectively in your app’s stylesheet.

## Delivery options
- npm: ESM or CommonJS (works in modern bundlers)
- CDN:
  - ESM: `https://cdn.jsdelivr.net/npm/visiojs/dist/visiojs.js`
  - UMD: `https://unpkg.com/visiojs` (global `window.visiojs`)

## Integration notes
- React: Compose visiojs in an effect hook and store state in component/state management.
- Vanilla: Initialize after DOM is ready; keep state in memory or localStorage as needed.