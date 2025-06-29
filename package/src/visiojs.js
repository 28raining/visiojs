import * as d3 from "d3";
import * as pako from "pako";
import { visiojs_router, userDraggingElbow } from "./router.js";
import { drawShape } from "./drawShape.js";
import { getConnectorLocation, defaultSettings, setDefaults } from "./commonFunctions.js";
// var equal = require('fast-deep-equal');
import equal from "fast-deep-equal";
import "./visiojs.css";

/**
 * Creates the VisioJS functions
 *
 * @param {Element} svgWhole - Is this needed?
 * @param {Element} initialState - Can this be removed?
 * @param {function} stateChanged - Triggered when the state changes, can be used to implement undo and redo.
 */
const visiojs = ({ initialState, stateChanged = () => {} }) => {
  var svg;
  var domWidth, domHeight;
  var wireStart = { connectorID: null, shapeID: null }; //used to store the wire start point when the user starts drawing a wire
  var selected = [];
  var g_wholeThing;
  var g_wires;
  var g_shapes;
  var g_svgGrid;
  var spacing;
  var zoomEnabled = false;

  initialState = setDefaults(initialState);
  const settings = { ...initialState.settings };

  function init(enableUndo = true) {
    spacing = settings.gridSize;
    svg = d3.select("#visiojs_top");
    g_wholeThing = d3.select("#visiojs_wholeThing");
    if (g_wholeThing.empty()) g_wholeThing = svg.append("g").attr("id", "visiojs_wholeThing");
    //remove old listeners
    svg.on("."); // removes all event listeners from the element

    svg.attr("tabindex", 0); //allow svg to be focusable (so keydowns only happen when svg is selected)
    svg.on("click", function () {
      deselectAll();
    });

    svg.on("dragover", function (e) {
      e.preventDefault(); // Allow drop
    });

    svg.on("drop", function (e) {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/json");
      const droppedData = JSON.parse(raw);
      const point = d3.pointer(e, g_wholeThing.node()); // ← gives [x, y] in SVG space
      const [x, y] = point;
      var [snappedX, snappedY] = snapAndClipToGrid([x, y]);
      addShape(droppedData, snappedX, snappedY);
    });

    d3.select(window).on("keydown.delete", (e) => {
      if ((e.key === "Backspace" || e.key === "Delete") && document.activeElement === svg.node()) {
        console.log("deleting");
        deleteSelected();
      }
    });

    d3.select(window).on("resize", function () {
      init(false);
    });

    const boundingRect = svg.node().getBoundingClientRect();
    domWidth = Math.round(boundingRect.width / spacing) * spacing;
    domHeight = Math.round(boundingRect.height / spacing) * spacing;

    //coloring for the connectors, some nice gradient fill
    var defs = d3.select("#visiojs_svgDefs");
    if (defs.empty()) {
      defs = svg.append("defs").attr("id", "visiojs_svgDefs");

      const gradient = defs.append("linearGradient").attr("id", "visiojs_connector_fill").attr("x1", 0).attr("y1", 1).attr("x2", 0).attr("y2", 0);
      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#4f6870");
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#678792");

      const elbowGradient = defs.append("linearGradient").attr("id", "visiojs_elbow_fill").attr("x1", 0).attr("y1", 1).attr("x2", 0).attr("y2", 0);
      elbowGradient.append("stop").attr("offset", "0%").attr("stop-color", "#cacaca");
      elbowGradient.append("stop").attr("offset", "100%").attr("stop-color", "#fdfdfd");
    }

    drawGrid(g_wholeThing, settings.width, settings.height, spacing);

    g_wires = d3.select("#visiojs_wires");
    if (g_wires.empty()) g_wires = g_wholeThing.append("g").attr("id", "visiojs_wires");
    g_shapes = d3.select("#visiojs_shapes");
    if (g_shapes.empty()) g_shapes = g_wholeThing.append("g").attr("id", "visiojs_shapes");

    // Zoom behavior
    // zoomHandler(settings.width, settings.height, domWidth, domHeight);
    //initialize to put point in the center of the screen
    const minZoom = Math.min(domWidth / settings.width, domHeight / settings.height);
    const zoom = d3
      .zoom()
      .scaleExtent([minZoom, settings.maxZoom])
      .clickDistance(10) // Prevents click suppression on touch devices
      .translateExtent([
        [-settings.width / 2, -settings.height / 2],
        [settings.width / 2, settings.height / 2],
      ])
      .on("zoom", (event) => g_wholeThing.attr("transform", event.transform));
    const initialTransform = d3.zoomIdentity.translate(domWidth / 2, domHeight / 2).scale(settings.defaultZoom);
    svg.call(zoom.transform, initialTransform);

    //Start reading from the json state
    drawFromJson(g_wholeThing, svg);
    if (enableUndo) stateChanged(initialState); //to prevent creating new states on window resize

    const zoomButtonWidth = 100;
    //create toggle zoom button
    // if (d3.select("#visiojs_toggle_button").empty())
    const zoomButton = d3.select("#visiojs_toggle_button").empty()
      ? svg
          .append("foreignObject")
          // .attr("x", domWidth - zoomButtonWidth - 5)
          .attr("y", 5)
          .attr("width", zoomButtonWidth)
          .attr("height", 50)
          .attr("id", "visiojs_toggle_button_foreign")
          .append("xhtml:body")
          .style("margin", "0px") // remove default body margin
          .style("background", "transparent") // remove default body margin
          .append("button")
          .attr("id", "visiojs_toggle_button")
          .text("Enable Zoom")
      : d3.select("#visiojs_toggle_button");

    // console.log("domWidth", domWidth, "domHeight", domHeight);
    d3.select("#visiojs_toggle_button_foreign").attr("x", boundingRect.width - zoomButtonWidth - 3);

    zoomButton.on("click", function () {
      if (zoomEnabled) {
        svg.on(".zoom", null); // remove zoom
        zoomButton.text("Enable Zoom");
        zoomButton.attr("class", null);
        zoomEnabled = false;
      } else {
        // zoomHandler(settings.width, settings.height, domWidth, domHeight);
        svg.call(zoom).on("dblclick.zoom", null);
        zoomButton.text("Disable Zoom");
        zoomButton.attr("class", "visiojs_toggle_button_active");
        zoomEnabled = true;
      }
    });
  }

  function snapAndClipToGrid(value, clip = true) {
    if (clip) {
      return [
        Math.min(Math.max(Math.round(value[0] / spacing) * spacing, -settings.width / 2), settings.width / 2),
        Math.min(Math.max(Math.round(value[1] / spacing) * spacing, -settings.height / 2), settings.height / 2),
      ];
    } else {
      return [Math.round(value[0] / spacing) * spacing, Math.round(value[1] / spacing) * spacing];
    }
  }

  function deselectAll() {
    // console.log("deselecting all");
    g_wholeThing.selectAll(".visiojs_hover_rect").style("opacity", "0");
    g_wholeThing.selectAll(".visiojs_hover_rotate").style("visibility", "hidden");

    // g_wholeThing.selectAll(".visiojs_hover_rotate").classed("visiojs_hover_rotate", false);
    g_wholeThing.selectAll(".visiojs_selected_wire").classed("visiojs_selected_wire", false);
    g_wholeThing.selectAll(".visiojs_selected_connector").classed("visiojs_selected_connector", false);

    g_wholeThing.selectAll(".visiojs_elbow").remove();

    selected.length = 0;
    //re-enable clicks on the shapes
    d3.select(`#visiojs_shapes`).style("pointer-events", "auto").style("opacity", "1.0");
  }

  function drawWire(id) {
    const g = g_wires;
    var wire = initialState["wires"][id];
    if (!wire) return;
    var startShape = d3.select(`#shape_${wire.start.shapeID}`);
    if (startShape.empty()) {
      console.log("ERROR - cannot find shapeID", wire.start.shapeID);
      return;
    }
    var endShape = d3.select(`#shape_${wire.end.shapeID}`);
    if (endShape.empty()) {
      console.log("ERROR - cannot find shapeID", wire.end.shapeID);
      return;
    }

    const divId = `wire_${id}`;
    var nodeWireGroup = d3.select(`#${divId}`);
    var nodeWire;
    // var nodeWire = d3.select(`#${divId}`);
    if (nodeWireGroup.empty()) {
      nodeWireGroup = g.insert("g").attr("id", `wire_${id}`);
      nodeWire = nodeWireGroup.insert("path").attr("class", "visiojs_wire");
    } else nodeWire = nodeWireGroup.select("path");
    const startConnector = getConnectorLocation(startShape, wire.start.shapeID, wire.start.connectorID, initialState, snapAndClipToGrid);
    const endConnector = getConnectorLocation(endShape, wire.end.shapeID, wire.end.connectorID, initialState, snapAndClipToGrid);
    // console.log(startConnector, "startConnector");
    // console.log(endConnector, "endConnector");
    const allPoints = [startConnector, ...wire.points, endConnector];

    //drawing the wire from the saved state
    // console.log("bp a")
    const optimizedPoints = visiojs_router("manhattan", allPoints, snapAndClipToGrid, nodeWireGroup, null, (o) => moveElbow(o), id);

    // //make this onClick into common code?
    // nodeWireGroup.on("mouseover", function () {
    //   disablePanAndZoom();
    // });
    // nodeWireGroup.on("mouseout", function () {
    //   enablePanAndZoom();
    // });
    nodeWireGroup.on("click", function (e) {
      e.stopPropagation(); //prevent the click from propagating to the svg element
      if (wireStart.shapeID !== null) return; //actively drawing a wire

      var connector1 = g_wholeThing.select(`#connector_${wire.start.shapeID}_${wire.start.connectorID}`);
      var connector2 = g_wholeThing.select(`#connector_${wire.end.shapeID}_${wire.end.connectorID}`);

      console.log("removing pointer events from shapes");
      d3.select(`#visiojs_shapes`).style("pointer-events", "none").style("opacity", "0.9");

      //call this to add the elbows to the wire
      const allPoints2 = [startConnector, ...wire.points, endConnector];

      visiojs_router("manhattan", allPoints2, snapAndClipToGrid, nodeWireGroup, true, (o) => moveElbow(o), id);

      // clickedShape = true;
      nodeWire.classed("visiojs_selected_wire", true);
      nodeWireGroup.raise(); //move it above other paths
      //change the color of the connectors
      connector1.classed("visiojs_selected_connector", true);
      connector2.classed("visiojs_selected_connector", true);
      const index = selected.indexOf(divId);
      if (index === -1) {
        //user clicked it and it wasn't already selected
        selected.push(divId);
      } else {
        //user clicked it again (to deslect it)
        selected.splice(index, 1);
        nodeWire.classed("visiojs_selected_wire", false);
        connector1.classed("visiojs_selected_connector", false);
        connector2.classed("visiojs_selected_connector", false);
        nodeWireGroup.lower(); //move it above other paths
        g_svgGrid.lower(); //move it above other paths
        nodeWireGroup.selectAll(".visiojs_elbow").remove(); //remove elbows
        //if selected contains no ids containing "wire" then re-enable clicks on the shapes
        if (selected.filter((s) => s.startsWith("wire")).length == 0) {
          console.log("re-enabling pointer events on shapes");
          d3.select(`#visiojs_shapes`).style("pointer-events", "auto").style("opacity", "1.0");
        }
        // g_wholeThing.selectAll(".visiojs_selected_connector").classed("visiojs_selected_connector", false);
      }
    });
    return optimizedPoints;
  }

  function drawFromJson() {
    for (let id = 0; id < initialState["shapes"].length; id++) {
      const s = initialState["shapes"][id];
      if (s)
        drawShape({
          id,
          data: s,
          selected,
          wireStart,
          snapAndClipToGrid,
          initialState,
          redrawWireOnShape,
          stateChanged,
          drawWire,
        });
    }
    for (let id = 0; id < initialState["wires"].length; id++) {
      drawWire(id);
    }
  }

  // Function to draw grid lines
  function drawGrid(g_wholeThing, SVG_width, SVG_height, spacing) {
    if (!d3.select("#visiojs_grid").empty()) return;
    g_svgGrid = g_wholeThing.append("g").attr("id", "visiojs_grid");
    const lines = [];

    // Vertical lines
    for (let x = -SVG_width / 2; x < SVG_width / 2; x += spacing) {
      lines.push({
        x1: x,
        y1: -SVG_height / 2,
        x2: x,
        y2: SVG_height / 2,
      });
    }

    // Horizontal lines
    for (let y = -SVG_height / 2; y < SVG_height / 2; y += spacing) {
      lines.push({
        x1: -SVG_width / 2,
        y1: y,
        x2: SVG_width / 2,
        y2: y,
      });
    }

    g_svgGrid
      .selectAll("line.grid-line")
      .data(lines)
      .join("line")
      .attr("class", "visiojs_grid_line")
      .attr("x1", (d) => d.x1)
      .attr("y1", (d) => d.y1)
      .attr("x2", (d) => d.x2)
      .attr("y2", (d) => d.y2);
  }

  function redrawWireOnShape({ shapeID, save = false, origXY = [], delta = {} }) {
    for (const w in initialState.wires) {
      if (!initialState.wires[w]) continue;
      const shapeIsStart = initialState.wires[w].start.shapeID == shapeID;
      const shapeIsEnd = initialState.wires[w].end.shapeID == shapeID;
      var connectorID = initialState.wires[w].start.connectorID;
      if (shapeIsEnd) connectorID = initialState.wires[w].end.connectorID;
      if (shapeIsStart || shapeIsEnd) {
        //when the shape is dragged, move the first elbow by the same amount
        if (origXY.length > 0 && initialState.wires[w].points.length > 0) {
          const original = origXY[connectorID];
          const firstPoint = initialState.wires[w].points[0];
          const lastPoint = initialState.wires[w].points[initialState.wires[w].points.length - 1];

          if (shapeIsStart) {
            // console.log("here start");
            if (original[0] == firstPoint[0]) firstPoint[0] += delta.x;
            else firstPoint[1] += delta.y;
          } else if (shapeIsEnd) {
            // console.log("here end", origX, origY, lastPoint, delta);
            if (original[0] == lastPoint[0]) lastPoint[0] += delta.x;
            else lastPoint[1] += delta.y;
          }
        }

        const newPoints = drawWire(w);
        if (save) {
          initialState.wires[w].points = newPoints; //all 'assumed' points are now part of the points array.
        }
      }
    }
  }

  const moveElbow = (o) => {
    userDraggingElbow({
      d3,
      snapAndClipToGrid,
      elbSvg: o.elbow,
      wireID: o.wireID,
      initialState,
      elbowID: o.elbowID,
      redrawWire: o.redrawWire,
      start: o.start,
      end: o.end,
      stateChanged,
    });
  };

  function addShape(droppedData_raw, x = null, y = null) {
    deselectAll();
    svg.node().focus(); //focus on the svg so that keydown events are captured
    const droppedData = JSON.parse(JSON.stringify(droppedData_raw)); //deep copy
    if (x !== null) droppedData.x = x;
    if (y !== null) droppedData.y = y;
    // console.log("Dropped at:", x, y);
    var index = initialState["shapes"].indexOf(null);
    if (index == -1) {
      index = initialState["shapes"].length; //if no null entry, then add to the end
      initialState["shapes"].push(droppedData);
    } else {
      initialState["shapes"][index] = droppedData;
    }
    stateChanged(initialState);
    drawShape({
      id: index,
      data: droppedData,
      selected,
      selectIt: true,
      wireStart,
      snapAndClipToGrid,
      initialState,
      redrawWireOnShape,
      stateChanged,
      drawWire,
    });
  }

  function deleteSelected() {
    for (const s of selected) {
      // console.log("removing id ", s);
      //remove the shape from the svg
      d3.select(`#${s}`).remove();
      //remove the shape from the initialState
      const shapeID = s.split("_");
      if (shapeID[0] == "shape") {
        initialState.shapes[shapeID[1]] = null;
        //remove the wires attached to the shape
        initialState.wires = initialState.wires.map((w, i) => {
          if (!w) return w;
          if (w.start.shapeID == shapeID[1] || w.end.shapeID == shapeID[1]) {
            d3.select(`#wire_${i}`).remove();
            return null;
          } else {
            return w;
          }
        });
      } else if (shapeID[0] == "wire") {
        initialState.wires[shapeID[1]] = null;
      }
    }
    stateChanged(initialState);
    deselectAll();
  }

  function redraw(newState) {
    deselectAll();
    const oldState = JSON.parse(JSON.stringify(initialState)); //save the old state for comparison
    initialState.shapes = JSON.parse(JSON.stringify(newState.shapes)); //update the initial state with the new state
    initialState.wires = JSON.parse(JSON.stringify(newState.wires)); //update the initial state with the new state
    // console.log("redrawing", oldState, initialState);

    // console.log("redrawing", oldState.shapes, initialState.shapes);
    //note - take advantage that we know only one thing can change between states. only one shape can change, and if a shape changes then wire didn't change
    //firstly compare the shapes
    if (!equal(oldState.shapes, initialState.shapes)) {
      console.log("shapes are different");
      var shapeAdded = false;
      //1 - check if shape was removed
      if (initialState.shapes.length < oldState.shapes.length) {
        d3.select(`#shape_${oldState.shapes.length - 1}`).remove();
        // oldState = initialState;
        return;
      }

      //2 - check if shape was moved or added (added becomes a null entry)
      for (const s in initialState.shapes) {
        if (!equal(oldState.shapes[s], initialState.shapes[s])) {
          console.log("delta in id ", s);
          shapeAdded = true;

          drawShape({
            id: s,
            data: initialState.shapes[s],
            selected,
            wireStart,
            snapAndClipToGrid,
            initialState,
            redrawWireOnShape,
            stateChanged,
            drawWire,
          });
          redrawWireOnShape({ shapeID: s });
          // return;
        }
      }
      if (shapeAdded) {
        // oldState = initialState;
        return;
      }
      console.log("ERROR - some shape change but not sure what was changed?");
    } else if (!equal(oldState.wires, initialState.wires)) {
      if (initialState.wires.length < oldState.wires.length) {
        d3.select(`#wire_${oldState.wires.length - 1}`).remove();
        // oldState = initialState;
        return;
      }
      //2 - redraw any wires that have changed
      for (const w in initialState.wires) {
        if (!equal(oldState.wires[w], initialState.wires[w])) {
          drawWire(w);
        }
      }
    } else console.log("it's all the same");
  }

  function stateToURLParam() {
    const jsonString = JSON.stringify(initialState);
    const compressed = pako.deflate(jsonString, { to: "string" });
    // Encode the compressed data to make it URL-safe
    const encodedCompressed = encodeURIComponent(btoa(String.fromCharCode(...compressed)));
    return encodedCompressed;
  }

  function URLToState(urlParameter) {
    try {
      const compressedBinary = Uint8Array.from(atob(decodeURIComponent(urlParameter)), (char) => char.charCodeAt(0));
      const decompressed = pako.inflate(compressedBinary, { to: "string" }); // Decompress the data using pako
      const decodedObject = JSON.parse(decompressed); // Parse the decompressed JSON string into an object
      initialState = setDefaults(decodedObject);
    } catch (e) {
      console.error("Error decoding URL state:", e);
    }
  }

  return {
    addShape,
    deleteSelected,
    redraw,
    stateToURLParam,
    URLToState,
    init,
  };
};

export { visiojs };
