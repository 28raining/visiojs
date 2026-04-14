import { useEffect, useRef, useState } from "react";
import visiojs from "visiojs";
import "../../../package/src/visiojs.css" //FIXME - review this wtih AI. Not a good example for others
import "./App.css";
import { initialSchematic } from "./initialState.js";

/** Resistor R0 in the bundled schematic — edit its reference label from the panel. */
const LABEL_EDIT_SHAPE_INDEX = 4;

// var vjs; //FIXME - vjs should be a state variable?
function App() {
  const [history, setHistory] = useState({ pointer: 0, state: [] });
  const historyRef = useRef(history);
  const [vjs, setVjs] = useState(null);
  const [labelDraft, setLabelDraft] = useState(
    () => initialSchematic.shapes[LABEL_EDIT_SHAPE_INDEX]?.label?.text ?? ""
  );

  const numUndos = 15;

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

 const addShapes = {
  opamp: {
    image: "opamp.svg",
    connectors: [
      [0, -32],
      [0, 32],
      [128, 0],
    ],
    x: 0,
    y: 0,
    offset: [0, -96],
    label: {
      text: "U1",
      class: "circuit_label",
      x: 96,
      y: -32,
    },
  },
  actor: {
    image: "actor.svg",
    connectors: [
      [0, -32],
      [0, 32],
      [128, 0],
    ],
    // scale: "0.2 0.2",
    width:100,
    height:200,
    x: 0,
    y: 0,
    offset: [0, 0],
    label: {
      text: "ACTOR",
      class: "circuit_label",
      x: 96,
      y: -32,
    },
  },
  resistor: {
    image: "resistor.svg",
    connectors: [
      [-32, 0],
      [64, 0],
    ],
    x: 0,
    y: 0,
    label: {
      text: "R1",
      class: "circuit_label",
      x: 16,
      y: -36,
    },
    offset: [-48, -48],
  },
  capacitor: {
    image: "capacitor.svg",
    connectors: [
      [0, -32],
      [0, 64],
    ],
    x: 0,
    y: 0,
    label: {
      text: "C1",
      class: "circuit_label",
      x: -28,
      y: 0,
    },
    offset: [-48, -64],
  },
  inductor: {
    image: "inductor.svg",
    connectors: [
      [-64, 0],
      [64, 0],
    ],
    x: 0,
    y: 0,
    label: {
      text: "L1",
      class: "circuit_label",
      x: 0,
      y: -30,
    },
    offset: [-80, -64],
  },
  vin: {
    image: "vin.svg",
    connectors: [[0, 0]],
    x: 0,
    y: 0,
    offset: [-64, 0],
  },
  iin: {
    image: "iin.svg",
    connectors: [[0, 0]],
    x: 0,
    y: 0,
    offset: [-64, 0],
  },
  gnd: {
    image: "gnd.svg",
    connectors: [[0, 0]],
    x: 0,
    y: 0,
    offset: [-100, -180],
  },
  vprobe: {
    image: "vprobe.svg",
    label: {
      text: "X1",
      class: "circuit_label",
      x: 0,
      y: -30,
    },
    connectors: [[0, 0]],
    x: 0,
    y: 0,
    offset: [-10, -90],
  },
  iprobe: {
    image: "iprobe.svg",
    label: {
      text: "Y1",
      class: "circuit_label",
      x: -64,
      y: -36,
    },
    connectors: [
      [-64, 0],
      [64, 0],
    ],
    x: 0,
    y: 0,
    offset: [-96, -64],
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
      vjs.applyState(old_h.state[old_h.pointer - 1], { source: "programmatic" });
      const h = { ...old_h };
      h.pointer = h.pointer - 1;
      return h;
    });
  }

  function redo() {
    setHistory((old_h) => {
      if (old_h.pointer >= old_h.state.length - 1) return old_h; //no more redos
      vjs.applyState(old_h.state[old_h.pointer + 1], { source: "programmatic" });
      const h = { ...old_h };
      h.pointer = h.pointer + 1;
      return h;
    });
  }

  function applyResistorLabelFromPanel() {
    if (!vjs) return;
    // Do not call applyState inside setHistory's updater — React Strict Mode runs that updater
    // twice in development, which would fire stateChanged / trackHistory twice (double undo).
    const old_h = historyRef.current;
    const base = old_h.state[old_h.pointer];
    if (!base) return;
    const next = JSON.parse(JSON.stringify(base));
    const shape = next.shapes[LABEL_EDIT_SHAPE_INDEX];
    if (!shape?.label) return;
    shape.label.text = labelDraft;
    vjs.applyState(next, { source: "user" });
  }

  useEffect(() => {
    var newVjs = visiojs({
      initialState: initialSchematic,
      stateChanged: trackHistory,
    });
    setVjs(newVjs);
  }, []);

  useEffect(() => {
    if (vjs) vjs.init();
  }, [vjs]);

  useEffect(() => {
    const st = history.state[history.pointer];
    const text = st?.shapes?.[LABEL_EDIT_SHAPE_INDEX]?.label?.text;
    if (text !== undefined) setLabelDraft(text);
  }, [history]);

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

        <div style={{ marginTop: "12px", marginBottom: "8px" }}>
          <label htmlFor="resistor-label-input" style={{ marginRight: "8px" }}>
            R0 label (panel edit):
          </label>
          <input
            id="resistor-label-input"
            type="text"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            style={{ marginRight: "8px" }}
          />
          <button type="button" onClick={() => applyResistorLabelFromPanel()} disabled={!vjs}>
            Apply label
          </button>
        </div>

        <div>
          <div style={{ border: "1px solid rgb(222, 226, 230)", display: "inline-block" }}>
            <svg id="visiojs_top" className="visiojs_svg"></svg>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
