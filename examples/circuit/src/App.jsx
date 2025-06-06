import { useRef, useEffect, useState } from "react";
import { visiojs } from "visiojs";
import "./App.css";
import { initialState } from "./initialState.js";

var vjs;
function App() {
  const initializedRef = useRef(false);
  const [history, setHistory] = useState({ pointer: 0, state: [] });

  const numUndos = 15;

  const addShapes = {
    opAmp: {
      shape: "opAmp.svg",
      connectors: [
        { x: 0, y: 64 },
        { x: 0, y: 128 },
        { x: 128, y: 96 },
      ],
      x: 0,
      y: 0,
    },
    vIn: {
      shape: "vIn.svg",
      connectors: [{ x: 64, y: 0 }],
      x: 0,
      y: 0,
    },
    resistor: {
      shape: "resistor.svg",
      connectors: [
        { x: 16, y: 48 },
        { x: 112, y: 48 },
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
      shape: "capacitor.svg",
      connectors: [
        { x: 48, y: 32 },
        { x: 48, y: 112 },
      ],
      x: 0,
      y: 0,
            label: {
        text: "C1",
        class: "circuit_label",
        x: 48,
        y: 24,
      },
    },
    inductor: {
      shape: "inductor.svg",
      connectors: [
        { x: 16, y: 64 },
        { x: 144, y: 64 },
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
      shape: "gnd.svg",
      connectors: [{ x: 64, y: 16 }],
      x: 0,
      y: 0,
    },
    vout: {
      shape: "vout.svg",
      connectors: [{ x: 16, y: 64 }],
      x: 0,
      y: 0,
    },
  };

  const trackHistory = (x) => {
    setHistory((old_h) => {
      const deepCopyState = JSON.parse(JSON.stringify(x));
      const h = { ...old_h };
      //there was an undo, then a new state was created. Throwing away the future history
      if (h.pointer < h.state.length - 1) h.state = h.state.slice(0, h.pointer + 1);
      if (h.state.length == numUndos) h.state = [...h.state.slice(1), deepCopyState];
      else h.state = [...h.state, deepCopyState];
      h.pointer = h.state.length - 1;
      return h;
    });
  };

  function undo() {
    //when undo is called form useeffect it receives stale state. Therefore, all state accessing is done inside the setHistory function
    setHistory((old_h) => {
      if (old_h.pointer == 0) return old_h; //no more undos
      vjs.redraw(old_h.state[old_h.pointer - 1]);
      const h = { ...old_h };
      h.pointer = h.pointer - 1;
      return h;
    });
  }

  function redo() {
    setHistory((old_h) => {
      if (old_h.pointer >= old_h.state.length - 1) return old_h; //no more redos
      vjs.redraw(old_h.state[old_h.pointer + 1]);
      const h = { ...old_h };
      h.pointer = h.pointer + 1;
      return h;
    });
  }

  useEffect(() => {
    //in react safe-mode this is executed twice which really breaks d3 event listeners & drag behavior. Using a ref to prevent double-initialization
    if (initializedRef.current) return;
    initializedRef.current = true;
    vjs = visiojs({
      initialState: initialState,
      stateChanged: trackHistory,
    });
    vjs.init();
  });

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: "1000px", height: "1000px", marginTop: "50px" }}>
        {Object.keys(addShapes).map((key) => {
          const shape = addShapes[key];
          return (
            <button
              key={key}
              style={{ display: "inline-block", cursor: "grab", marginRight: "10px" }}
              draggable="true"
              onDragStart={(e) => {
                window.dragData = shape;
                e.dataTransfer.setData("application/json", JSON.stringify(shape));
              }}
              onClick={() => vjs.addShape(shape)}
            >
              {key}
            </button>
          );
        })}

        {/* <button
        style={{ display: "inline-block", cursor: "grab", marginRight: "10px" }}
        draggable="true"
        onDragStart={(e) => {
          window.dragData = opAmp;
          e.dataTransfer.setData("application/json", JSON.stringify(opAmp));
        }}
        onClick={()=>vjs.addShape(opAmp)}
      >
        Op-Amp
      </button> */}
        <button
          style={{ display: "inline-block", marginRight: "10px" }}
          id="delete"
          onClick={() => vjs.deleteSelected()}
        >
          Delete
        </button>
        <button
          style={{ display: "inline-block", marginRight: "10px" }}
          id="undo"
          disabled={history.pointer == 0}
          onClick={() => undo()}
        >
          Undo
        </button>
        <button
          style={{ display: "inline-block" }}
          id="redo"
          disabled={history.pointer >= history.state.length - 1}
          onClick={() => redo()}
        >
          Redo
        </button>

        <div>
          <div style={{ border: "1px solid rgb(222, 226, 230)", display: "inline-block" }}>
            <svg id="visiojs_top" className="visiojs_svg"></svg>
          </div>
        </div>

        <input type="text" />
      </div>
    </div>
  );
}

export default App;
