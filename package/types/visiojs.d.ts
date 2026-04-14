declare module "visiojs" {
  export type ApplyStateSource = "user" | "programmatic";

  export interface VisiojsOptions {
    initialState: object;
    stateChanged?: (state: object) => void;
  }

  export interface VisiojsInstance {
    /** Requires {@link VisiojsInstance.init} first. */
    addShape: (shape: object, x?: number, y?: number) => void;
    /** Requires {@link VisiojsInstance.init} first. */
    deleteSelected: () => void;
    /**
     * Requires {@link VisiojsInstance.init} first. Replace `shapes` and `wires` from `newState` and repaint.
     * `programmatic` does not invoke `stateChanged`; `user` invokes it once after applying (for host-driven “commits”).
     */
    applyState: (newState: object, options: { source: ApplyStateSource }) => void;
    /**
     * @deprecated Use {@link VisiojsInstance.applyState} with `{ source: 'programmatic' }`.
     * Requires {@link VisiojsInstance.init} first. Expects `newState` with `shapes` and `wires`.
     */
    redraw: (newState: object) => void;
    /**
     * Binds to `#visiojs_top`, builds layers and listeners, and draws from current state.
     * Call after the host SVG is in the document, before `applyState`, `addShape`, or `deleteSelected`.
     */
    init: (enableUndo?: boolean) => void;
  }

  /**
   * Returns an instance that does not touch the DOM until {@link VisiojsInstance.init} runs.
   */
  function visiojs(options: VisiojsOptions): VisiojsInstance;

  export default visiojs;
}