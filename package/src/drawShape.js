import * as d3 from "d3";
import { constructWire } from "./router.js";
import { getGroupTranslate, getGroupRotation, getConnectorLocation } from "./commonFunctions.js";

const dragDatabase = {
  clickStartX: 0,
  clickStartY: 0,
  objStartX: 0,
  objStartY: 0,
  shapeDom: null,
  shapeID: null,
};

const dragGenerator = (dragDatabase, snapAndClipToGrid, initialState, redrawWireOnShape, stateChanged) => {
  return () => {
    return d3
      .drag()
      .clickDistance(10)
      .on("start", function (event) {
        dragDatabase.clickStartX = event.x;
        dragDatabase.clickStartY = event.y;
        dragDatabase.shapeDom = d3.select(this);
        dragDatabase.shapeID = Number(dragDatabase.shapeDom.attr("id").split("_")[1]);
        [dragDatabase.objStartX, dragDatabase.objStartY] = getGroupTranslate(dragDatabase.shapeDom);
      })
      .on("end", function (event) {
        const deltaX = event.x - dragDatabase.clickStartX;
        const deltaY = event.y - dragDatabase.clickStartY;
        const [newX, newY] = snapAndClipToGrid([dragDatabase.objStartX + deltaX, dragDatabase.objStartY + deltaY]);
        if (newX == dragDatabase.objStartX && newY == dragDatabase.objStartY) return; //no movement
        redrawWireOnShape({ shapeID: dragDatabase.shapeID, save: true });
        stateChanged(initialState);
      })
      .on("drag", function (event) {
        const deltaX = event.x - dragDatabase.clickStartX;
        const deltaY = event.y - dragDatabase.clickStartY;
        const [newX, newY] = snapAndClipToGrid([dragDatabase.objStartX + deltaX, dragDatabase.objStartY + deltaY]);

        // get rotation out of the transform attribute
        // const myObj = dragDatabase.shapeDom;
        if (newX == initialState.shapes[dragDatabase.shapeID].x && newY == initialState.shapes[dragDatabase.shapeID].y) return;
        const delta = {
          x: newX - initialState.shapes[dragDatabase.shapeID].x,
          y: newY - initialState.shapes[dragDatabase.shapeID].y,
        };
        const rotation = getGroupRotation(dragDatabase.shapeDom);
        dragDatabase.shapeDom.attr("transform", `translate(${newX}, ${newY}) rotate(${rotation})`);
        const origXY = [];
        for (const c in initialState.shapes[dragDatabase.shapeID].connectors) {
          origXY.push(getConnectorLocation(dragDatabase.shapeDom, dragDatabase.shapeID, c, initialState, snapAndClipToGrid));
        }

        initialState.shapes[dragDatabase.shapeID].x = newX;
        initialState.shapes[dragDatabase.shapeID].y = newY;
        redrawWireOnShape({ shapeID: dragDatabase.shapeID, origXY, delta });
      });
  };
};
// let dragHandler = dragGenerator(dragDatabase);

export async function drawShape({ id, data, selectIt = false, selected, wireStart, snapAndClipToGrid, initialState, redrawWireOnShape, stateChanged, drawWire }) {
  const divId = `shape_${id}`;
  const g = d3.select("#visiojs_shapes");
  var shape = d3.select(`#${divId}`);
  if (data === null) {
    shape.remove();
    return;
  }
  // if (!existingShape.empty()) return;
  const url = data.image;
  const x = data.x;
  const y = data.y;
  const connectors = data.connectors === undefined ? [] : data.connectors;
  const rotation = data.rotation;
  const label = data.label;
  // const attributes = data.attr;
  const fixed = data.fixed === undefined ? false : data.fixed;
  const offset = data.offset === undefined ? [0, 0] : data.offset;

  // var bgRect;

  // console.log('drawing shape', divId, d3.select(divId).empty())
  if (shape.empty()) {
    shape = g.append("g").attr("id", divId);
    var img;
    if (url.endsWith(".svg")) {
      const data = await d3.xml(url);
      const importedSvg = data.documentElement;
      shape.node().appendChild(importedSvg);
      img = d3.select(importedSvg);
      img.attr("transform", `translate(${offset[0]}, ${offset[1]})`);
    } else img = shape.append("image").attr("href", url);

    //add a clickable backround

    if (selectIt) {
      selected.push(divId);
    }
    addHoverRect(shape, id, offset, initialState, redrawWireOnShape, img, selectIt, stateChanged);

    if (label) {
      shape
        .append("text")
        .attr("stroke", "none") // prevent inherited stroke outline
        .attr("x", label.x)
        .attr("y", label.y)
        .text(label.text)
        .attr("class", label.class);
    }

    for (let conn = 0; conn < connectors.length; conn++) {
      const c = connectors[conn];
      connector({
        x: c[0],
        y: c[1],
        group: shape,
        shapeID: id,
        connectorID: conn,
        wireStart,
        snapAndClipToGrid,
        initialState,
        drawWire,
        stateChanged,
      });
    }

    if (fixed === false) {
      shape.style("cursor", "pointer");
      shape.on("mouseover", function () {
        if (wireStart.shapeID !== null) return;
        if (selected.includes(divId)) return;
        img.attr("opacity", 0.5); //reduce opacity
      });
      shape.on("mouseout", function () {
        img.attr("opacity", 1.0); //reduce opacity
        // console.log(divId, selected, selected.includes(divId));
        // if (!selected.includes(divId)) shape.selectAll(".visiojs_hover_rect").remove();
      });
      shape.on("click", function (e) {
        if (wireStart.shapeID !== null) return;

        e.stopPropagation(); //prevent the click from propagating to the svg element

        // clickedShape = true;
        img.attr("opacity", 1.0); //restore opacity
        const index = selected.indexOf(divId);
        if (index === -1) {
          selected.push(divId);
          shape.selectAll(".visiojs_hover_rect").style("opacity", "1");
          shape.selectAll(".visiojs_hover_rotate").style("visibility", null);
        } else {
          console.log("removing rect 3");
          selected.splice(index, 1);
          // shape.selectAll(".visiojs_hover_rect").remove();
          shape.selectAll(".visiojs_hover_rect").style("opacity", "0");
          shape.selectAll(".visiojs_hover_rotate").style("visibility", "hidden");

          img.attr("opacity", 0.5);
        }
      });
      shape.call(dragGenerator(dragDatabase, snapAndClipToGrid, initialState, redrawWireOnShape, stateChanged)());
    }
  }
  // for (const a in attributes) shape.attr(a, attributes[a]);
  var rotateStr = "";
  if (rotation) rotateStr = `rotate(${rotation})`;
  shape.attr("transform", `translate(${x}, ${y}) ${rotateStr}`);
}

function addHoverRect(shape, shapeID, offset, initialState, redrawWireOnShape, img, selectIt, stateChanged) {
  // const bbox = itemToBox.node().getBBox();
  const bbox = img.node().getBBox();
  const [rotateX, rotateY] = [bbox.x + bbox.width + offset[0] + 10, bbox.y + offset[1] - 10];

  const bgRect = shape
    .append("rect")
    .attr("x", bbox.x - 5)
    .attr("y", bbox.y - 5)
    .attr("width", bbox.width + 10)
    .attr("height", bbox.height + 10)
    .attr("class", "visiojs_hover_rect")
    .attr("transform", `translate(${offset[0]}, ${offset[1]})`);
  if (!selectIt) bgRect.style("opacity", "0");
  // bgRect.style("opacity", "1");
  const rotateButton = shape
    .append("g")
    .attr("width", "16")
    .attr("height", "16")
    .attr("fill", "currentColor")
    .attr("viewBox", "0 0 16 16")
    .attr("transform", `translate(${rotateX}, ${rotateY})`)
    .attr("class", "visiojs_hover_rotate");
  if (!selectIt) rotateButton.style("visibility", "hidden");
  rotateButton.append("path").attr("fill-rule", "evenodd").attr("d", "M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z");
  rotateButton.append("path").attr("d", "M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466");
  rotateButton.append("rect").attr("x", "0").attr("y", "0").attr("width", "16").attr("height", "16").attr("fill", "transparent"); //an area to click on
  // rotateButton.on("mouseover", function () {
  //   disablePanAndZoom();
  //   shape.on(".drag", null);
  // });
  // rotateButton.on("mouseout", function () {
  //   enablePanAndZoom();
  //   shape.call(dragHandler());
  // });
  rotateButton.on("click", function (e) {
    e.stopPropagation();
    const rotation = getGroupRotation(shape);
    const [x, y] = getGroupTranslate(shape); //is this the same as bbox.x?

    const newRotation = (rotation + 90) % 360;
    shape.attr("transform", `translate(${x}, ${y}) rotate(${newRotation})`);
    initialState.shapes[shape.attr("id").split("_")[1]].rotation = newRotation;

    redrawWireOnShape({ shapeID: shapeID, save: true });

    stateChanged(initialState);

    // console.log(initialState);
  });

  // console.log(temp)
}

const connector = ({ x, y, group, shapeID, connectorID, wireStart, snapAndClipToGrid, initialState, drawWire, stateChanged }) => {
  const smRadius = 8;
  const bgRadius = 16;
  const svg = d3.select("#visiojs_top");
  // var lineGroup;
  // var finishedLineColor = "#888888";
  // var wireMidPoints = [];
  // var lineStartX, lineStartY;
  // var lineEnd = {};

  function endLine(e, wireMidPoints, lineGroup, hoverConnector) {
    if (wireStart.shapeID === null) return; //not drawing a line
    e.stopPropagation();
    d3.select("#visiojs_tempconn").remove();
    svg.on("mousemove.drawline", null);
    svg.on("dblclick.endline", null);
    svg.on("click.endline", null);
    // svg.on(".endline", null); finishedLineColor
    d3.select(window).on(".endline", null); //looking for keydown esc
    if (hoverConnector.shapeID === null) lineGroup.remove();
    else if (hoverConnector.shapeID == wireStart.shapeID && hoverConnector.connectorID == wireStart.connectorID) lineGroup.remove();
    else {
      const newWire = {
        start: { ...wireStart },
        end: { ...hoverConnector },
        points: wireMidPoints,
      }
      var index = initialState["wires"].indexOf(null);
      if (index == -1) {
        index = initialState["wires"].length; //if no null entry, then add to the end
        initialState["wires"].push(newWire);
      } else {
        initialState["wires"][index] = newWire;
      }

      // initialState.wires.push({
      //   start: { ...wireStart },
      //   end: { ...hoverConnector },
      //   points: wireMidPoints,
      // });
      lineGroup.remove();
      const optimizedPoints = drawWire(index);
      initialState.wires[index].points = optimizedPoints; //all 'assumed' points are now part of the points array.
    }
    wireStart.shapeID = null; // reset wireStart
    wireStart.connectorID = null; // reset wireStart
  }

  group
    .append("circle")
    .attr("r", smRadius)
    .attr("cx", x)
    .attr("cy", y)
    .attr("fill", "url(#visiojs_connector_fill)")
    .attr("class", "visiojs_connector")
    .attr("id", `connector_${shapeID}_${connectorID}`)
    .on("mouseover", function () {
      d3.select(this).transition().duration(200).attr("r", bgRadius);
      // group.on(".drag", null); // remove drag event listeners
      // svg.on(".zoom", null); // remove drag event listeners
      // disablePanAndZoom();
      // hoverConnector = { shapeID, connectorID };
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(200).attr("r", smRadius);
      // group.call(dragHandler());
      // hoverConnector = null;
      // enablePanAndZoom();
    })
    .on("mousedown", function (e) {
      d3.select(this).transition().duration(200).attr("r", smRadius);
      if (wireStart.shapeID !== null) return; // already drawing a line
      constructWire({
        prevEvent: e,
        group,
        shapeID,
        connectorID,
        x,
        y,
        endLine,
        snapAndClipToGrid,
        wireStart,
        svg,
        initialState,
        stateChanged,
      });
    })
    .on("touchstart", function (e) {
      d3.select(this).transition().duration(200).attr("r", smRadius);
      if (wireStart.shapeID !== null) return; // already drawing a line
      // e.stopPropagation();
      // disablePanAndZoom();
      constructWire({
        prevEvent: e,
        group,
        shapeID,
        connectorID,
        x,
        y,
        endLine,
        snapAndClipToGrid,
        wireStart,
        svg,
        initialState,
        stateChanged,
      });
    });
};
