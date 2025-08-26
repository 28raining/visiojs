declare module "visiojs" {
  export interface VisiojsOptions {
    initialState: object;
    stateChanged?: (state: object) => void;
  }

  export interface VisiojsInstance {
    addShape: (shape: object, x?: number, y?: number) => void;
    deleteSelected: () => void;
    redraw: (newState: object) => void;
    init: (enableUndo?: boolean) => void;
  }

  function visiojs(options: VisiojsOptions): VisiojsInstance;

  export default visiojs;
}