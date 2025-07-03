# visiojs

An embeddable javascript library with 1% of Microsoft Visio's features!

![visiojs demo](https://raw.githubusercontent.com/28raining/visiojs/main/package/demo.png)

Use this library to let users build flow charts and circuits inside the browser. 
Size is ~100KB gzipped

visiojs is great because
- It works on touch devices
- The state is stored in json format, allowing easy undo / redo / save / manpiulation
- easily integrated into React projects or into simple vanilla js
- User has total visual control through css classes
- strictly snaps everything to the grid (you may hide the grid using css and set it to 1px steps)
- lightweight - 100KB including d3.js

## Examples of how to use visiojs

### Codepen
https://codepen.io/28raining/pen/myJYavL

### NPM + REACT

```
cd examples/circuit_react
npm i
npm run dev
```

### Vanilla js
```
cd examples/circuit_vanilla
npx serve
or
python3 -m http.server
```

### onlinecircuitsolver.com
https://onlinecircuitsolver.com/

## Installation

## NPM

```
npm i visiojs
```
Then add these lines to your jsx
```
import visiojs from "visiojs";
import "visiojs/dist/visiojs.css";
```



### VanillaJS
Import as a module: (see codepen)
```
<script type="module">
  import { visiojs } from "https://cdn.jsdelivr.net/npm/visiojs@0.0.0/dist/visiojs.js";
</script>
```

Import globally (see vanilla js example)
```
<script src="https://cdn.jsdelivr.net/npm/visiojs"></script>
```


## Documentation

Is a work in progress...
Please refer to the example projects to see every feature, and look at visiojs.css to see which styles can be overriden.

