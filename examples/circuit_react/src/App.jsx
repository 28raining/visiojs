import { useEffect, useState } from "react";
import { visiojs } from "visiojs";
import "visiojs/dist/visiojs.css";
import "./App.css";
import { initialState } from "./initialState.js";

// var vjs; //FIXME - vjs should be a state variable?
function App() {
  const [history, setHistory] = useState({ pointer: 0, state: [] });
  const [vjs, setVjs] = useState(null);

  const numUndos = 15;

  const addShapes = {
    opAmp: {
      image: "opAmp.svg",
      connectors: [
        [0, 64],
        [0, 128],
        [128, 96],
      ],
      x: 0,
      y: 0,
    },
    vIn: {
      image: "vIn.svg",
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
      offset:[-48,-64],
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
      image: "vout.svg",
      connectors: [[16, 64]],
      x: 0,
      y: 0,
    },
  };

  const trackHistory = (newState) => {
    // console.log("state changed", newState);
    setHistory((old_h) => {
      const deepCopyState = JSON.parse(JSON.stringify(newState));
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
    var newVjs = visiojs({
      initialState: initialState,
      stateChanged: trackHistory,
    });
    setVjs(newVjs);
  }, []);

  useEffect(() => {
    if (vjs) vjs.init();
  }, [vjs]);

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
        <button style={{ display: "inline-block", marginRight: "10px" }} id="delete" onClick={() => vjs.deleteSelected()}>
          Delete
        </button>
        <button style={{ display: "inline-block", marginRight: "10px" }} id="undo" disabled={history.pointer == 0} onClick={() => undo()}>
          Undo
        </button>
        <button style={{ display: "inline-block" }} id="redo" disabled={history.pointer >= history.state.length - 1} onClick={() => redo()}>
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
