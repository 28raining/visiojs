import { beforeEach, describe, expect, it, vi } from "vitest";
import visiojs from "../src/visiojs.js";

const minimalState = () => ({
  settings: {
    gridSize: 32,
    width: 2432,
    height: 1792,
    defaultZoom: 1,
    maxZoom: 2,
  },
  shapes: [],
  wires: [],
});

function mountVisioSvg() {
  document.body.innerHTML =
    "<svg id=\"visiojs_top\" width=\"800\" height=\"600\" viewBox=\"0 0 800 600\"></svg>";
  const el = document.getElementById("visiojs_top");
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0,
    toJSON() {},
  });
}

describe("applyState and stateChanged", () => {
  beforeEach(() => {
    mountVisioSvg();
  });

  it("does not invoke stateChanged for programmatic apply when init used enableUndo false", () => {
    let calls = 0;
    const initialState = minimalState();
    const v = visiojs({
      initialState,
      stateChanged: () => {
        calls++;
      },
    });
    v.init(false);
    expect(calls).toBe(0);

    v.applyState({ shapes: [], wires: [] }, { source: "programmatic" });
    expect(calls).toBe(0);
  });

  it("invokes stateChanged once for user source on same empty state", () => {
    let calls = 0;
    const v = visiojs({
      initialState: minimalState(),
      stateChanged: () => {
        calls++;
      },
    });
    v.init(false);
    expect(calls).toBe(0);

    v.applyState({ shapes: [], wires: [] }, { source: "user" });
    expect(calls).toBe(1);
  });

  it("redraw matches programmatic apply (no extra stateChanged)", () => {
    let calls = 0;
    const v = visiojs({
      initialState: minimalState(),
      stateChanged: () => {
        calls++;
      },
    });
    v.init(false);
    v.applyState({ shapes: [], wires: [] }, { source: "programmatic" });
    expect(calls).toBe(0);
    v.redraw({ shapes: [], wires: [] });
    expect(calls).toBe(0);
  });
});
