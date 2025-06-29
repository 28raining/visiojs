export function getGroupTranslate(selection) {
  const transform = selection.attr("transform");
  const match = transform && transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
  return match ? [parseFloat(match[1]), parseFloat(match[2])] : [0, 0];
}

//function to get the rotation amount from the transform attribute
export function getGroupRotation(transform) {
  const match = transform && transform.match(/rotate\(([^)]+)\)/);
  return match ? parseFloat(match[1]) : 0;
}

export function rotatePoints(x, y, rotation) {
  const h = Math.sqrt(x * x + y * y);
  const angle = Math.atan2(y, x);
  const newY = h * Math.sin(angle + (rotation * Math.PI) / 180);
  const newX = h * Math.cos(angle + (rotation * Math.PI) / 180);
  return [newX, newY];
}

export function getConnectorLocation(shapeDom, shapeID, connectorID, initialState, snapAndClipToGrid) {
  // console.log("getConnectorLocation called with shapeDom:", shapeDom, "shapeID:", shapeID, "connectorID:", connectorID, "initialState:", initialState);
  const [gStartX, gStartY] = [initialState["shapes"][shapeID].x, initialState["shapes"][shapeID].y];
  var connStartX = initialState["shapes"][shapeID].connectors[connectorID][0];
  var connStartY = initialState["shapes"][shapeID].connectors[connectorID][1];
  const transform = shapeDom.attr("transform");
  const rotationStart = transform ? getGroupRotation(transform) : (initialState["shapes"][shapeID].rotation != undefined ? initialState["shapes"][shapeID].rotation : 0); //if no transform, get rotation from state. Maybe always get rotation from state? this was a patch fix, didn't investigate if it could be permanent
  // console.log('shapeDom', rotationStart, shapeDom.attr("transform"))
  const [rotX, rotY] = rotatePoints(connStartX, connStartY, rotationStart);
  return snapAndClipToGrid([gStartX + rotX, gStartY + rotY]);
  // return { x: snapped[0], y: snapped[1] };
}


export const defaultSettings = {
  gridSize: 16,
  width: 2432,
  height: 1792,
  defaultZoom: 1,
  maxZoom: 2,
};
export function setDefaults(state) {
  if (!state.shapes) state.shapes = [];
  if (!state.wires) state.wires = [];
  if (!state.settings) state.settings = {};
  for (const k in defaultSettings) {
    if (state.settings[k] === undefined) state.settings[k] = defaultSettings[k];
    if (typeof defaultSettings[k] === "object") {
      for (const k2 in defaultSettings[k]) {
        if (state.settings[k][k2] === undefined) state.settings[k][k2] = defaultSettings[k][k2];
      }
    }
  }
  return state;
}