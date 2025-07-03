//  or to use module, uncomment below line and remove the import from index.html
//import { visiojs } from "https://cdn.jsdelivr.net/npm/visiojs@latest/dist/visiojs.js";
const addShapes = {
  opAmp: {
    image: "opamp.svg",
    connectors: [
      [0, 64],
      [0, 128],
      [128, 96],
    ],
    x: 0,
    y: 0,
  },
  vIn: {
    image: "vin.svg",
    connectors: [[64, 0]],
    x: 0,
    y: 0,
  },
  resistor: {
    image: "resistor.svg",
    connectors: [
      [16, 48],
      [112, 48],
    ],
    x: 0,
    y: 0,
    label: {
      text: "R1",
      class: "circuit_label",
      x: 64,
      y: 14,
    },
  },
  capacitor: {
    image: "capacitor.svg",
    connectors: [
      [0, -32],
      [0, 48],
    ],
    x: 0,
    y: 0,
    offset: [-48, -64],
    label: {
      text: "C1",
      class: "circuit_label",
      x: 48,
      y: 24,
    },
  },
  inductor: {
    image: "inductor.svg",
    connectors: [
      [16, 64],
      [144, 64],
    ],
    x: 0,
    y: 0,
    label: {
      text: "L1",
      class: "circuit_label",
      x: 80,
      y: 32,
    },
  },
  gnd: {
    image: "gnd.svg",
    connectors: [[64, 16]],
    x: 0,
    y: 0,
  },
  vout: {
    image: "vprobe.svg",
    connectors: [[16, 64]],
    x: 0,
    y: 0,
  },
};
const initialSchematic = {
  settings: {
    defaultZoom: 0.75,
    gridSize: 32,
    width: 2432,
    height: 1792,
    maxZoom: 2,
  },
  shapes: [
    {
      image: "origin.svg",
      x: 0,
      y: 0,
      fixed: true,
      offset: [-32, -32],
    },
    {
      image: "gnd.svg",
      connectors: [[0, 0]],
      x: 192,
      y: 128,
      offset: [-100, -180],
    },
    {
      image: "vin.svg",
      connectors: [[0, 0]],
      x: -192,
      y: 0,
      offset: [-64, 0],
    },
    {
      image: "inductor.svg",
      connectors: [
        [-64, 0],
        [64, 0],
      ],
      x: -96,
      y: -64,
      label: {
        text: "L0",
        class: "circuit_label",
        x: 0,
        y: -30,
      },
      offset: [-80, -64],
    },
    {
      image: "resistor.svg",
      connectors: [
        [-32, 0],
        [64, 0],
      ],
      x: 64,
      y: -64,
      label: {
        text: "R0",
        class: "circuit_label",
        x: 16,
        y: -36,
      },
      offset: [-48, -48],
    },
    {
      image: "capacitor.svg",
      connectors: [
        [0, -32],
        [0, 64],
      ],
      x: 192,
      y: 32,
      label: {
        text: "C0",
        class: "circuit_label",
        x: -28,
        y: 0,
      },
      offset: [-48, -64],
    },
    {
      image: "vprobe.svg",
      connectors: [[0, 0]],
      x: 0,
      y: -160,
      offset: [-10, -90],
      label: {
        text: "X0",
        class: "circuit_label",
        x: 0,
        y: -30,
      },
    },
  ],
  wires: [
    {
      start: {
        connectorID: 0,
        shapeID: 1,
      },
      end: {
        shapeID: 5,
        connectorID: 1,
      },
      points: [],
    },
    {
      start: {
        connectorID: 0,
        shapeID: 5,
      },
      end: {
        shapeID: 4,
        connectorID: 1,
      },
      points: [[192, -64]],
    },
    {
      start: {
        connectorID: 0,
        shapeID: 4,
      },
      end: {
        shapeID: 3,
        connectorID: 1,
      },
      points: [],
    },
    {
      start: {
        connectorID: 0,
        shapeID: 3,
      },
      end: {
        shapeID: 2,
        connectorID: 0,
      },
      points: [[-192, -64]],
    },
    {
      start: {
        connectorID: 0,
        shapeID: 6,
      },
      end: {
        shapeID: 3,
        connectorID: 1,
      },
      points: [[0, -64]],
    },
  ],
};
const numUndos = 15;
const container = document.getElementById("shape-buttons");
Object.keys(addShapes).forEach((key) => {
  const shape = addShapes[key];
  const btn = document.createElement("button");
  btn.textContent = key;
  btn.style.display = "inline-block";
  btn.style.cursor = "grab";
  btn.style.marginRight = "10px";
  btn.draggable = true;
  btn.addEventListener("dragstart", function (e) {
    window.dragData = shape;
    e.dataTransfer.setData("application/json", JSON.stringify(shape));
  });
  btn.addEventListener("click", function () {
    vjs.addShape(shape);
  });
  container.appendChild(btn);
});

let history = { pointer: 0, state: [] };
function setHistory(newValue) {
  history = newValue;
}

function trackHistory(newState) {
  const deepCopyState = JSON.parse(JSON.stringify(newState));
  const h = { ...history };
  //there was an undo, then a new state was created. Throwing away the future history
  if (h.pointer < h.state.length - 1) h.state = h.state.slice(0, h.pointer + 1);
  if (h.state.length == numUndos) h.state = [...h.state.slice(1), deepCopyState];
  else h.state = [...h.state, deepCopyState];
  h.pointer = h.state.length - 1;
  setHistory(h);
}

function undo() {
  //when undo is called form useeffect it receives stale state. Therefore, all state accessing is done inside the setHistory function
  if (history.pointer == 0) return; //no more undos
  vjs.redraw(history.state[history.pointer - 1]);
  const h = { ...history };
  h.pointer = h.pointer - 1;
  setHistory(h);
}

function redo() {
  if (history.pointer >= history.state.length - 1) return; //no more redos
  vjs.redraw(history.state[history.pointer + 1]);
  const h = { ...history };
  h.pointer = h.pointer + 1;
  setHistory(h);
}

const vjs = visiojs({
  initialState: initialSchematic,
  stateChanged: trackHistory,
});
window.onload = () => {
  vjs.init();
};

// Delete button
document.getElementById("delete").addEventListener("click", function () {
  vjs.deleteSelected();
});

// Undo button
document.getElementById("undo").addEventListener("click", function () {
  undo();
});

// Redo button
document.getElementById("redo").addEventListener("click", function () {
  redo();
});
