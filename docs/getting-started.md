# Getting Started

## Installation (npm)
```bash
npm install visiojs
# or
yarn add visiojs
# or
pnpm add visiojs
```

Import in your app:
```js
// ESM
import visiojs from 'visiojs';
import 'visiojs/dist/visiojs.css';

// CommonJS
const visiojs = require('visiojs');
require('visiojs/dist/visiojs.css');
```

## CDN (no build tools)

ES module:
```html
<link rel="stylesheet" href="https://unpkg.com/visiojs/dist/visiojs.css" />
<script type="module">
  import visiojs from 'https://cdn.jsdelivr.net/npm/visiojs/dist/visiojs.js';
  // Your code here...
</script>
```

UMD (global):
```html
<link rel="stylesheet" href="https://unpkg.com/visiojs/dist/visiojs.css" />
<script src="https://unpkg.com/visiojs"></script>
<script>
  // window.visiojs is available
</script>
```

## Examples (recommended starting point)
- React: https://github.com/28raining/visiojs/tree/main/examples/circuit_react
  ```bash
  cd examples/circuit_react
  npm i
  npm run dev
  ```
- Vanilla: https://github.com/28raining/visiojs/tree/main/examples/circuit_vanilla
  ```bash
  cd examples/circuit_vanilla
  npx serve
  # or
  python3 -m http.server
  ```

Next: See the Usage guide for common patterns and customization.