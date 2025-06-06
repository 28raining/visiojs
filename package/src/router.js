import * as d3 from "d3";
import { getGroupTranslate, getGroupRotation, rotatePoints } from "./commonFunctions.js";
export function visiojs_router(
  pathType,
  points,
  snapToGrid,
  wireGroup,
  showElbows,
  moveElbowCallback,
  wireID
) {
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
    pathGen.moveTo(points[0].x, points[0].y);
    linePoints.push([points[0].x, points[0].y]);

    var start, end, mid;
    var pointsDeepCopy = points;
    // var pointsDeepCopy = points.map((pRaw, i) => {
    //   var p = { ...pRaw };
    //   if (i == 1) {
    //     if (p.x === null) p.x = points[0].x;
    //     if (p.y === null) p.y = points[0].y;
    //   }
    //   if (i == points.length - 2) {
    //     if (p.x === null) p.x = points[points.length - 1].x;
    //     if (p.y === null) p.y = points[points.length - 1].y;
    //   }
    //   return p;
    // });
    // console.log("points", pointsDeepCopy)

    // //remove redundant points (where three points are in a straight line)
    // for (i = 1; i < pointsDeepCopy.length - 2; i++) {
    //   start = pointsDeepCopy[i - 1];
    //   mid = pointsDeepCopy[i];
    //   end = pointsDeepCopy[i+1];
    //   if ((start.x == mid.x && mid.x == end.x) || (start.y == mid.y && mid.y == end.y)) {
    //     //remove the middle point
    //     pointsDeepCopy.splice(i, 1);
    //     i--;
    //   }
    // }

    for (i = 1; i < pointsDeepCopy.length; i++) {
      start = pointsDeepCopy[i - 1];
      end = pointsDeepCopy[i];
      if (start.x == end.x || start.y == end.y) {
        // pathGen.lineTo(end.x, end.y);
        linePoints.push([end.x, end.y]);
      } else {
        var stepX = snapToGrid((end.x - start.x) / 2); // gridSpacing * Math.round((end.x - start.x) / (2 * gridSpacing));

        // pathGen.lineTo(start.x + stepX, start.y);
        // pathGen.lineTo(start.x + stepX, end.y);
        // pathGen.lineTo(end.x, end.y);
        linePoints.push([start.x + stepX, start.y]);
        linePoints.push([start.x + stepX, end.y]);
        linePoints.push([end.x, end.y]);
        // elbowPoints.push({ x: start.x + stepX, y: start.y });
        // elbowPoints.push({ x: start.x + stepX, y: end.y });
      }
      // elbowPoints.push(end);
    }

    // console.log('linePoints a', JSON.parse(JSON.stringify(linePoints)))

    //remove redundant points (where three points are in a straight line)
    for (i = 1; i < linePoints.length - 1; i++) {
      // if (i == linePoints.length - 1)
      //   elbowPoints.push({ x: linePoints[i][0], y: linePoints[i][1] });
      // else {
      start = linePoints[i - 1];
      mid = linePoints[i];
      end = linePoints[i + 1];

      // console.log("start", start, "mid", mid, "end", end);
      if ((start[0] == mid[0] && mid[0] == end[0]) || (start[1] == mid[1] && mid[1] == end[1])) {
        //remove the middle point
        linePoints.splice(i, 1);
        i--;
      } else elbowPoints.push({ x: linePoints[i][0], y: linePoints[i][1] });
      // }
    }
    // console.log('linePoints', linePoints)

    linePoints.map((p) => pathGen.lineTo(p[0], p[1]));
    line.attr("d", pathGen.toString());
    // return pathGen.toString();
  }

  //draw the elbow boxes
  wireGroup.selectAll(".elbow").remove();
  // console.log(elbowPoints.length, "96")
  if (showElbows) {
    for (var e = 0; e < elbowPoints.length; e++) {
      start = elbowPoints[e];
      const elbowID = e;
      // console.log("stepX", stepX, "stepY", stepY)
      // console.log("rect ", i)
      const elbow = wireGroup
        .append("rect")
        .attr("class", "elbow")
        .attr("x", start.x - elbowWidth / 2)
        .attr("y", start.y - elbowWidth / 2)
        .attr("width", elbowWidth)
        .attr("height", elbowWidth)
        .attr("fill", "url(#elbow_fill)")
        .attr("stroke", "rgb(160, 160, 160)")
        .attr("stroke-width", 0.5)
        .style("cursor", "move");
      moveElbowCallback({
        elbowID,
        elbow,
        wireID,
        start: points[0],
        end: points[points.length - 1],
        redrawWire: (newPoints) =>
          visiojs_router(
            pathType,
            newPoints,
            snapToGrid,
            wireGroup,
            showElbows,
            moveElbowCallback,
            wireID
          ),
      });
      // console.log('elbow set up with i', i)
    }
  }
  // console.log("elbowPoints", elbowPoints, points);
  return elbowPoints;
  // .attr("fill", "url(#connector_fill)")
}

//spare code below - to add bezier curves, but not needed because we found "stroke-linejoin" svg attribute
// var yBez = bez;
// var xBez = bez;
// if (end.y < start.y) {
//   yBez = -bez;
// }
// if (end.x < start.x) {
//   xBez = -bez;
// }

// pathGen.lineTo(start.x + stepX - xBez, start.y);
// pathGen.quadraticCurveTo(start.x + stepX, start.y, start.x + stepX, start.y + yBez);
// pathGen.lineTo(start.x + stepX, end.y - yBez);
// pathGen.quadraticCurveTo(start.x + stepX, end.y, start.x + stepX + xBez, end.y);

export function userDraggingElbow({
  d3,
  snapToGrid,
  elbSvg,
  wireID,
  initialState,
  elbowID,
  redrawWire,
  start,
  end,
  stateChanged,
}) {
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
      const delta = {
        x: snapToGrid(event.x - mouseStart.x),
        y: snapToGrid(event.y - mouseStart.y),
      };
      //FIXME - can use event.dx/dy?
      if (delta.x === lastDelta.x && delta.y === lastDelta.y) return; //no movement, no need to redraw
      lastDelta = { ...delta };
      // console.log('delta old vs new', delta.x, event.dx, event.x,mouseX);
      // console.log("old points", [...initialState.wires[wireID].points]);
      const newPoints = initialState.wires[wireID].points.map((p, i) => {
        if (i === elbowID) {
          return { x: p.x + delta.x, y: p.y + delta.y };
          //if the line moves in x, also move the adjacent point with the same x coordinate
        } else if (
          (i === elbowID - 1 || i === elbowID + 1) &&
          p.x === initialState.wires[wireID].points[elbowID].x
        ) {
          return { x: p.x + delta.x, y: p.y };
        } else if (
          (i === elbowID - 1 || i === elbowID + 1) &&
          p.y === initialState.wires[wireID].points[elbowID].y
        ) {
          return { x: p.x, y: p.y + delta.y };
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

function constructLine(
  mouseX,
  mouseY,
  lineGroup,
  wireMidPoints,
  lineStartX,
  lineStartY,
  line,
  hoverConnector,
  snapToGrid,
  zoomTform,
  initialState
) {
  const zz = zoomTform;
  const start = { x: lineStartX, y: lineStartY };
  const end = {
    x: snapToGrid((mouseX - zz.x) / zz.k),
    y: snapToGrid((mouseY - zz.y) / zz.k),
  };
  var pointsStartEnd = [start, end];
  var pointsAll = pointsStartEnd.slice(0, 1).concat(wireMidPoints, pointsStartEnd.slice(1)); //simply puts midpoints in the middle, doesn't mess up if midpoints is empty

  //when building a wire
  // console.log("bp c")
  visiojs_router(
    "manhattan",
    pointsAll,
    snapToGrid,
    lineGroup,
    null,
    (o) => moveElbow(o),
    initialState.wires.length
  );

  const endCircle = d3.select("#tempconn");
  endCircle.attr("cx", end.x).attr("cy", end.y).style("visibility", "visible");

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
  snapToGrid,
  wireStart,
  svg,
  initialState,
  stateChanged,
}) => {
  prevEvent.stopPropagation();
  prevEvent.preventDefault(); //prevents highlighting of the text during the drag

  var [lineStartX, lineStartY] = getGroupTranslate(group);
  const rotation = getGroupRotation(group);
  const [rotatedX, rotatedY] = rotatePoints(x, y, rotation);
  lineStartX = snapToGrid(lineStartX + rotatedX);
  lineStartY = snapToGrid(lineStartY + rotatedY);
  wireStart.shapeID = shapeID;
  wireStart.connectorID = connectorID;
  const hoverConnectorNew = { shapeID: null, connectorID: null }; // -1 is a sentinel value to indicate no hover

  // Add line
  const g_wires = d3.select("#wires");

  if (lineGroup === null) lineGroup = g_wires.insert("g").style("cursor", "pointer"); //FIXME - don't pass linegroup as argument?
  if (line === null) line = lineGroup.append("path").attr("class", "visiojs_wire");
  var newCircle = d3.select("#tempconn");
  if (newCircle.empty()) {
    newCircle = lineGroup
      .append("circle")
      .attr("r", 10)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", "url(#connector_fill)")
      .attr("stroke", "#1b1b1b")
      .attr("class", "connector")
      .attr("id", "tempconn")
      .style("visibility", "hidden");
  }

  line.attr("stroke-dasharray", "5,5");
  line.classed("visiojs_bad_wire", true);

  function checkHover(x, y) {
    const el = document.elementFromPoint(x, y);
    if (el && el.classList.contains("connector") && el.id != "tempconn") {
      const match = el.id.split("_");
      hoverConnectorNew.shapeID = match[1];
      hoverConnectorNew.connectorID = match[2];
      // console.log("hoverConnectorNew:", hoverConnectorNew);
    } else {
      hoverConnectorNew.shapeID = null;
      hoverConnectorNew.connectorID = null;
    }
  }

  svg.on("touchmove.drawline", function (event) {
    const touch = event.touches[0]; // Get the first touch point
    checkHover(touch.pageX, touch.pageY);
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
      snapToGrid,
      d3.zoomTransform(svg.node()),
      initialState
    );
  });

  // Mouse move handler to update line
  svg.on("mousemove.drawline", function (event) {
    checkHover(event.pageX, event.pageY);
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
      snapToGrid,
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
    const [mouseX, mouseY] = d3.pointer(e, svg.node());
    const zz = d3.zoomTransform(svg.node());
    var lineEnd = {}; // FIXME - simplify out this var?
    lineEnd.x = snapToGrid((mouseX - zz.x) / zz.k);
    lineEnd.y = snapToGrid((mouseY - zz.y) / zz.k);
    if (
      hoverConnectorNew.shapeID != null &&
      !(hoverConnectorNew.connectorID == connectorID && hoverConnectorNew.shapeID == shapeID)
    ) {
      // console.log("single click + hover");
      endLine(e, wireMidPoints, lineGroup, hoverConnectorNew);
      stateChanged(initialState);
    } else {
      wireMidPoints.push({ ...lineEnd });
      // console.log("add a point", wireMidPoints);
    }
  });
  svg.on("touchend.endline", (e) => {
    const touch = e.changedTouches[0]; // Get the first touch point
    console.log("touch endline");
    const [mouseX, mouseY] = d3.pointer(touch, svg.node());
    const zz = d3.zoomTransform(svg.node());
    var lineEnd = {}; // FIXME - simplify out this var?
    lineEnd.x = snapToGrid((mouseX - zz.x) / zz.k);
    lineEnd.y = snapToGrid((mouseY - zz.y) / zz.k);

    if (hoverConnectorNew.shapeID != null) {
      console.log("single click + hover");
      endLine(e, wireMidPoints, lineGroup, hoverConnectorNew);
      stateChanged(initialState);
    } else {
      wireMidPoints.push({ ...lineEnd });
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
          snapToGrid,
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
