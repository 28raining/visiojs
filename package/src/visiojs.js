import * as d3 from "d3";
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

  initialState = setDefaults(initialState);
  const settings = { ...initialState.settings };

  function init(enableUndo = true) {
    spacing = settings.gridSize;
    svg = d3.select("#visiojs_top").attr("style", "display:block");
    g_wholeThing = d3.select("#wholeThing");
    if (g_wholeThing.empty()) g_wholeThing = svg.append("g").attr("id", "wholeThing");
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
      var snappedX = snapToGrid(x);
      var snappedY = snapToGrid(y);
      //prevent drop being run twice - if the previous entry has the same x and y
      for (const s of initialState["shapes"]) {
        if (s) {
          if (s.x === snappedX && s.y === snappedY) {
            console.log("Already there");
            return;
          }
        }
      }
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

    domWidth = snapToGrid(svg.node().getBoundingClientRect().width); // initialState.settings.width;  //putting width and height in CSS allows the size to be dynamically set (e.g. like 90vh)
    domHeight = snapToGrid(svg.node().getBoundingClientRect().height); //initialState.settings.height;

    //coloring for the connectors, some nice gradient fill
    var defs = d3.select("#svgDefs");
    if (defs.empty()) defs = svg.append("defs").attr("id", "svgDefs");

    // const defs = svg.append("defs").attr("id", "svgDefs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "connector_fill")
      .attr("x1", 0)
      .attr("y1", 1)
      .attr("x2", 0)
      .attr("y2", 0);
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#4f6870");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#678792");

    const elbowGradient = defs
      .append("linearGradient")
      .attr("id", "elbow_fill")
      .attr("x1", 0)
      .attr("y1", 1)
      .attr("x2", 0)
      .attr("y2", 0);
    elbowGradient.append("stop").attr("offset", "0%").attr("stop-color", "#cacaca");
    elbowGradient.append("stop").attr("offset", "100%").attr("stop-color", "#fdfdfd");

    drawGrid(g_wholeThing, settings.width, settings.height, spacing);

    g_wires = d3.select("#wires");
    if (g_wires.empty()) g_wires = g_wholeThing.append("g").attr("id", "wires");
    g_shapes = d3.select("#shapes");
    if (g_shapes.empty()) g_shapes = g_wholeThing.append("g").attr("id", "shapes");

    // Zoom behavior
    zoomHandler(settings.width, settings.height, domWidth, domHeight);

    //Start reading from the json state
    drawFromJson(g_wholeThing, svg);
    if (enableUndo) stateChanged(initialState); //to prevent creating new states on window resize
  }

  function snapToGrid(value) {
    return Math.round(value / spacing) * spacing;
  }

  function deselectAll() {
    // console.log("deselecting all");
    g_wholeThing.selectAll(".visiojs_hover_rect").classed("visiojs_hover_rect", false);
    g_wholeThing.selectAll(".hover-rotate").remove();

    // g_wholeThing.selectAll(".hover-rotate").classed("hover-rotate", false);
    g_wholeThing.selectAll(".visiojs_selected_wire").classed("visiojs_selected_wire", false);
    g_wholeThing
      .selectAll(".visiojs_selected_connector")
      .classed("visiojs_selected_connector", false);

    g_wholeThing.selectAll(".elbow").remove();

    selected.length = 0;
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
    // //FIXME - can this be common code? - location c
    // nodeWire
    //   // .attr("d", pathData)
    //   .attr("stroke", "#888888");
    // var allPoints = [{ x: gStartX + connStartX, y: gStartY + connStartY }];
    // if (wire.points) allPoints = allPoints.concat(wire.points);
    // allPoints.push({ x: gEndX + connEndX, y: gEndY + connEndY });
    const startConnector = getConnectorLocation(
      startShape,
      wire.start.shapeID,
      wire.start.connectorID,
      initialState,
      snapToGrid
    );
    const endConnector = getConnectorLocation(
      endShape,
      wire.end.shapeID,
      wire.end.connectorID,
      initialState,
      snapToGrid
    );
    // console.log(startConnector, "startConnector");
    // console.log(endConnector, "endConnector");
    const allPoints = [startConnector, ...wire.points, endConnector];

    //drawing the wire from the saved state
    // console.log("bp a")
    const optimizedPoints = visiojs_router(
      "manhattan",
      allPoints,
      snapToGrid,
      nodeWireGroup,
      null,
      (o) => moveElbow(o),
      id
    );

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

      var connector1 = g_wholeThing.select(
        `#connector_${wire.start.shapeID}_${wire.start.connectorID}`
      );
      var connector2 = g_wholeThing.select(
        `#connector_${wire.end.shapeID}_${wire.end.connectorID}`
      );

      //call this to add the elbows to the wire
      const allPoints2 = [startConnector, ...wire.points, endConnector];

      visiojs_router(
        "manhattan",
        allPoints2,
        snapToGrid,
        nodeWireGroup,
        true,
        (o) => moveElbow(o),
        id
      );

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
        nodeWireGroup.selectAll(".elbow").remove(); //remove elbows
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
          snapToGrid,
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
    if (!d3.select("#grid").empty()) return;
    // console.log('grid exists',d3.select(`#grid`).empty());
    g_svgGrid = g_wholeThing.append("g").attr("id", "grid");
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
      .attr("class", "grid-line")
      .attr("x1", (d) => d.x1)
      .attr("y1", (d) => d.y1)
      .attr("x2", (d) => d.x2)
      .attr("y2", (d) => d.y2)
      .attr("stroke", "rgb(240, 240, 240)")
      .attr("stroke-width", 1);
  }

  const zoomHandler = (width, height, domWidth, domHeight) => {
    const minZoom = Math.min(domWidth / width, domHeight / height);
    const zoom = d3
      .zoom()
      .scaleExtent([minZoom, settings.maxZoom])
      .clickDistance(10) // Prevents click suppression on touch devices
      .translateExtent([
        [-width / 2, -height / 2],
        [width / 2, height / 2],
      ])
      .on("zoom", (event) => g_wholeThing.attr("transform", event.transform));

    svg.call(zoom);

    //initialize to put point in the center of the screen
    const initialTransform = d3.zoomIdentity
      .translate(domWidth / 2, domHeight / 2)
      .scale(settings.defaultZoom);
    svg.call(zoom.transform, initialTransform);

    return zoom;
  };

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
          // const origX = tempOrigX.x;
          // const origY = tempOrigX.y;
          const firstPoint = initialState.wires[w].points[0];
          const lastPoint = initialState.wires[w].points[initialState.wires[w].points.length - 1];

          if (shapeIsStart) {
            // console.log("here start");
            if (original.x == firstPoint.x) firstPoint.x += delta.x;
            else firstPoint.y += delta.y;
          } else if (shapeIsEnd) {
            // console.log("here end", origX, origY, lastPoint, delta);
            if (original.x == lastPoint.x) lastPoint.x += delta.x;
            else lastPoint.y += delta.y;
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
      snapToGrid,
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
    initialState["shapes"].push(droppedData);
    stateChanged(initialState);
    drawShape({
      id: initialState["shapes"].length - 1,
      data: droppedData,
      selected,
      selectIt: true,
      wireStart,
      snapToGrid,
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
            snapToGrid,
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

  return {
    addShape,
    deleteSelected,
    redraw,
    init,
  };
};

export { visiojs };
