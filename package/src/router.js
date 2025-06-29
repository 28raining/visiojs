import * as d3 from "d3";
import { getGroupTranslate, getGroupRotation, rotatePoints } from "./commonFunctions.js";
export function visiojs_router(pathType, points, snapAndClipToGrid, wireGroup, showElbows, moveElbowCallback, wireID) {
  // console.log("points", points, "wireID", wireID);
  var i;
  var elbowWidth = 10;
  var elbowPoints = [];

  //it's hard to click on a wire of width 3, so we draw an invisible box around - NOT IMPLEMENTED
  const line = wireGroup.select("path");
  // for (const a in attributes) line.attr(a, attributes[a]);
  // .attr("stroke-opacity", "0.9");

  // const bez = 3; //number of pixels for the bezier curve
  var linePoints = [];
  if (pathType == "manhattan") {
    const pathGen = d3.path();
    pathGen.moveTo(...points[0]);
    linePoints.push(points[0]);

    var start, end, mid;
    var pointsDeepCopy = points;

    for (i = 1; i < pointsDeepCopy.length; i++) {
      start = pointsDeepCopy[i - 1];
      end = pointsDeepCopy[i];
      if (start[0] == end[0] || start[1] == end[1]) {
        linePoints.push(end);
      } else {
        var stepX = snapAndClipToGrid([(end[0] - start[0]) / 2, 0])[0]; // gridSpacing * Math.round((end.x - start.x) / (2 * gridSpacing));

        linePoints.push([start[0] + stepX, start[1]]);
        linePoints.push([start[0] + stepX, end[1]]);
        linePoints.push(end);
      }
    }

    //remove redundant points (where three points are in a straight line)
    for (i = 1; i < linePoints.length - 1; i++) {
      start = linePoints[i - 1];
      mid = linePoints[i];
      end = linePoints[i + 1];

      // console.log("start", start, "mid", mid, "end", end);
      if ((start[0] == mid[0] && mid[0] == end[0]) || (start[1] == mid[1] && mid[1] == end[1])) {
        //remove the middle point
        linePoints.splice(i, 1);
        i--;
      } else elbowPoints.push([linePoints[i][0], linePoints[i][1]]);
      // }
    }
    // console.log('linePoints', linePoints)

    linePoints.map((p) => pathGen.lineTo(p[0], p[1]));
    line.attr("d", pathGen.toString());
    // return pathGen.toString();
  }

  //draw the elbow boxes
  wireGroup.selectAll(".visiojs_elbow").remove();
  // console.log(elbowPoints.length, "96")
  if (showElbows) {
    for (var e = 0; e < elbowPoints.length; e++) {
      start = elbowPoints[e];
      const elbowID = e;
      // console.log("stepX", stepX, "stepY", stepY)
      // console.log("rect ", i)
      const elbow = wireGroup
        .append("rect")
        .attr("class", "visiojs_elbow")
        .attr("x", start[0] - elbowWidth / 2)
        .attr("y", start[1] - elbowWidth / 2)
        .attr("width", elbowWidth)
        .attr("height", elbowWidth)
        .attr("fill", "url(#visiojs_elbow_fill)");
      moveElbowCallback({
        elbowID,
        elbow,
        wireID,
        start: points[0],
        end: points[points.length - 1],
        redrawWire: (newPoints) => visiojs_router(pathType, newPoints, snapAndClipToGrid, wireGroup, showElbows, moveElbowCallback, wireID),
      });
      // console.log('elbow set up with i', i)
    }
  }
  // console.log("elbowPoints", elbowPoints, points);
  return elbowPoints;
}

export function userDraggingElbow({ d3, snapAndClipToGrid, elbSvg, wireID, initialState, elbowID, redrawWire, start, end, stateChanged }) {
  // To support this
  // 1 - all wire points should go into initial state - no corners should be 'assumed' after the wire is created
  // 2 - if elbow is dragged up, move this point and either adjacent point with the same y coordinate
  // 3 - redraw the wire

  var lastDelta = { x: 0, y: 0 }; //to prevent unnecessary redraws
  var pontsToBeSaved = [];
  var mouseStart = { x: 0, y: 0 }; //to store the mouse position when the drag starts

  const drag = d3
    .drag()
    .clickDistance(10) // minimum distance to start dragging
    .on("start", (e) => {
      [mouseStart.x, mouseStart.y] = [e.x, e.y];
    })
    .on("drag", (event) => {
      const snapped = snapAndClipToGrid([event.x - mouseStart.x, event.y - mouseStart.y]);
      const delta = {
        x: snapped[0],
        y: snapped[1],
      };
      //FIXME - can use event.dx/dy?
      if (delta.x === lastDelta.x && delta.y === lastDelta.y) return; //no movement, no need to redraw
      lastDelta = { ...delta };
      const newPoints = initialState.wires[wireID].points.map((p, i) => {
        if (i === elbowID) {
          return [p[0] + delta.x, p[1] + delta.y];
          //if the line moves in x, also move the adjacent point with the same x coordinate
        } else if ((i === elbowID - 1 || i === elbowID + 1) && p[0] === initialState.wires[wireID].points[elbowID][0]) {
          return [p[0] + delta.x, p[1]];
        } else if ((i === elbowID - 1 || i === elbowID + 1) && p[1] === initialState.wires[wireID].points[elbowID][1]) {
          return [p[0], p[1] + delta.y];
        }

        return p;
      });
      // console.log("delta", delta);
      // console.log("new points", newPoints);
      var fullPoints = [start, end];
      fullPoints.splice(1, 0, ...newPoints);
      pontsToBeSaved = [...redrawWire(fullPoints)];
    })
    .on("end", () => {
      initialState.wires[wireID].points = [...pontsToBeSaved];
      stateChanged(initialState);
    });

  elbSvg.call(drag);
}

function checkHover(x, y, hoverConnectorNew) {
  const el = document.elementFromPoint(x, y);
  if (el && el.classList.contains("visiojs_connector") && el.id != "visiojs_tempconn") {
    const match = el.id.split("_");
    hoverConnectorNew.shapeID = Number(match[1]);
    hoverConnectorNew.connectorID = Number(match[2]);
  } else {
    hoverConnectorNew.shapeID = null;
    hoverConnectorNew.connectorID = null;
  }
}

function constructLine(mouseX, mouseY, lineGroup, wireMidPoints, lineStartX, lineStartY, line, hoverConnector, snapAndClipToGrid, zoomTform, initialState) {
  const zz = zoomTform;
  const start = [lineStartX, lineStartY];
  const end = snapAndClipToGrid([(mouseX - zz.x) / zz.k, (mouseY - zz.y) / zz.k]);
  // const end = {
  //   x: snapped[0],
  //   y: snapped[1],
  // };
  // var pointsStartEnd = [start, end];
  var pointsAll = [start, ...wireMidPoints, end]; //;pointsStartEnd.slice(0, 1).concat(wireMidPoints, pointsStartEnd.slice(1)); //simply puts midpoints in the middle, doesn't mess up if midpoints is empty

  //when building a wire
  // console.log("bp c")
  visiojs_router("manhattan", pointsAll, snapAndClipToGrid, lineGroup, null, (o) => moveElbow(o), initialState.wires.length);

  const endCircle = d3.select("#visiojs_tempconn");
  endCircle.attr("cx", end[0]).attr("cy", end[1]).style("visibility", "visible");

  //check it tempconn is over a connector
  const rect = endCircle.node().getBoundingClientRect();
  const centerX = rect.left + 5;
  const centerY = rect.top + 5;

  checkHover(centerX, centerY, hoverConnector);

  if (hoverConnector.shapeID != null) {
    line.classed("visiojs_good_wire", true);
    line.classed("visiojs_bad_wire", false);
  } else {
    line.classed("visiojs_good_wire", false);
    line.classed("visiojs_bad_wire", true);
  }
}

//when the user is actively drawing a new wire
//FIXME - linegroup and line tget thru d3 select
export const constructWire = ({
  prevEvent,
  group,
  shapeID,
  connectorID,
  x,
  y,
  endLine,
  wireMidPoints = [],
  lineGroup = null,
  line = null,
  snapAndClipToGrid,
  wireStart,
  svg,
  initialState,
  stateChanged,
}) => {
  prevEvent.stopPropagation();
  prevEvent.preventDefault(); //prevents highlighting of the text during the drag

  var [lineStartX, lineStartY] = getGroupTranslate(group);
  const rotation = getGroupRotation(group.attr("transform"));
  const [rotatedX, rotatedY] = rotatePoints(x, y, rotation);
  [lineStartX, lineStartY] = snapAndClipToGrid([lineStartX + rotatedX, lineStartY + rotatedY]);
  wireStart.shapeID = shapeID;
  wireStart.connectorID = connectorID;
  const hoverConnectorNew = { shapeID: null, connectorID: null }; // -1 is a sentinel value to indicate no hover

  // Add line
  const g_wires = d3.select("#visiojs_wires");

  if (lineGroup === null) lineGroup = g_wires.insert("g"); //FIXME - don't pass linegroup as argument?
  if (line === null) line = lineGroup.append("path").attr("class", "visiojs_wire");
  var newCircle = d3.select("#visiojs_tempconn");
  if (newCircle.empty()) {
    newCircle = lineGroup
      .append("circle")
      .attr("r", 10)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", "url(#visiojs_connector_fill)")
      .attr("class", "visiojs_connector")
      .attr("id", "visiojs_tempconn")
      .style("visibility", "hidden");
  }

  line.attr("stroke-dasharray", "5,5");
  line.classed("visiojs_bad_wire", true);

  svg.on("touchmove.drawline", function (event) {
    const touch = event.touches[0]; // Get the first touch point
    // checkHover(touch.clientX, touch.clientY);
    // }
    event.preventDefault(); // Optional: prevents scrolling
    const [mouseX, mouseY] = d3.pointer(touch, svg.node());
    constructLine(
      mouseX,
      mouseY,
      lineGroup,
      wireMidPoints,
      lineStartX,
      lineStartY,
      line,
      hoverConnectorNew,
      snapAndClipToGrid,
      d3.zoomTransform(svg.node()),
      initialState
    );
  });

  // Mouse move handler to update line
  svg.on("mousemove.drawline", function (event) {
    // checkHover(event.clientX, event.clientY);
    const [mouseX, mouseY] = d3.pointer(event, svg.node());
    constructLine(
      mouseX,
      mouseY,
      lineGroup,
      wireMidPoints,
      lineStartX,
      lineStartY,
      line,
      hoverConnectorNew,
      snapAndClipToGrid,
      d3.zoomTransform(svg.node()),
      initialState
    );
  });
  d3.select(window).on("keydown.endline", (e) => {
    if (e.key === "Escape") {
      hoverConnectorNew.shapeID = null;
      hoverConnectorNew.connectorID = null;
      endLine(e, wireMidPoints, lineGroup, hoverConnectorNew);
    }
  });

  // Second click anywhere ends drawing
  svg.on("dblclick.endline", (e) => {
    // console.log("dblclick");
    endLine(e, wireMidPoints, lineGroup, hoverConnectorNew);
  });
  svg.on("click.endline", (e) => {
    if (hoverConnectorNew.shapeID != null && !(hoverConnectorNew.connectorID == connectorID && hoverConnectorNew.shapeID == shapeID)) {
      // console.log("single click + hover");
      endLine(e, wireMidPoints, lineGroup, hoverConnectorNew);
      stateChanged(initialState);
    } else {
      const [mouseX, mouseY] = d3.pointer(e, svg.node());
      const zz = d3.zoomTransform(svg.node());
      const snapped = snapAndClipToGrid([(mouseX - zz.x) / zz.k, (mouseY - zz.y) / zz.k]);

      wireMidPoints.push(snapped);
      // console.log("add a point", wireMidPoints);
    }
  });
  svg.on("touchend.endline", (e) => {
    const touch = e.changedTouches[0]; // Get the first touch point
    console.log("touch endline");
    // var lineEnd = {}; // FIXME - simplify out this var?
    // [lineEnd.x, lineEnd.y] = snapAndClipToGrid([(mouseX - zz.x) / zz.k,(mouseY - zz.y) / zz.k]);

    if (hoverConnectorNew.shapeID != null) {
      console.log("single click + hover");
      endLine(e, wireMidPoints, lineGroup, hoverConnectorNew);
      stateChanged(initialState);
    } else {
      const [mouseX, mouseY] = d3.pointer(touch, svg.node());
      const zz = d3.zoomTransform(svg.node());

      wireMidPoints.push(snapAndClipToGrid([(mouseX - zz.x) / zz.k, (mouseY - zz.y) / zz.k]));
      console.log("add a point", wireMidPoints);

      newCircle.on("touchstart", function (e) {
        console.log("cvb mousedown on connector", shapeID, connectorID);
        constructWire({
          prevEvent: e,
          group,
          shapeID,
          connectorID,
          x,
          y,
          endLine,
          wireMidPoints,
          lineGroup,
          line,
          snapAndClipToGrid,
          wireStart,
          svg,
          initialState,
          stateChanged,
        });
        // newCircle.remove();
      });
    }
  });
};
