## Critical to-do's
60 - move all stying to css, so it can be overridden by user, and declutter the code
62 - split the code into multiple files!! like draw wire
63 - sometimes the svg labels are getting highlighted
65 - eliminate the dev example project
66 - create function to create gzipped url param


## ToDO
33 - Create an example with 100x100 boxes (10k components)
37 - Use x and y in shape to translate to 0,0. In case user has an SVG with 500px of offset or something
38 - Fix this issue where SVG isn't filling the full width in circuit solver
41 - add a dx and dy so when you drop objects it's centered on your mouse
-- can use this to propery rotate around its center?
44 - test with jpg import instead of svg


## Lower priority
- can svgwhole ref now be removed the because the border is re-added
11d - make the connectors blue when clicked line
16 - pass errors back to some handler (what errors - there shouldn't be any!)
17 - you can select mulitple things and drag (wire and shape)
31d - currently it's possible to route under the op amp - anything easy to do to solve it?
34 - create jsdoc documentation
45 - should mouseout be swapped with mouseleave? mouse can move too fast to trigger mouseout
43 - click within bounding box, not on the path -- we'll see how the circuit drawer turns out


## Done
1 - draggable rectangle
1b - drag consider mouse offset where it clicks the object
2 - add connector points to the rectangle
3 - hover on connector makes it bigger
4 - drag lines out the connectors
4a - make the lines look nice (rounded)
4b - lines must move when the shape moves
4c - draw the lines that come with initShape
5 - Imports shapes thru a json
6 - snap to grid
6 - button to add a new shape
7 - lines can be dropped on other connecters only
7a - new lines go into the json
7d - esc should cancel the line drawing
7c - nice connection animation like draw2d
8 - Add a new shape via drag
9 - lines routed with manhattan style
10 - when dragging show the bounding box, change opacity
-- change opacity on mouse over
- Make it not use REACT (web page can use react)
11 - allow deleting of lines and shapes
11a - if user is deleting from a different text box, don't delete selected
11b - wires are too hard to click. Add a rectangle along its path - ACTUALLY - cursor pointer solves this
11c - change cursor to pointer on hover
11e - drag should snap to grid
11f - sometimes line is selected but not red - click line then shape, why not red any more?
12 - make the connectors look good
13 - ability to rotate shapes
14 - add text labels to shape
13a - add rotate button
15 - allow shapes colors to be changed
17 - test with a touch screen, test on other browsers
17a - add delete buttons - user has no keyboard
20 - lines mid points can be moved
20a- lines click whilst drawing adds a mid-point
22 - when user clicks whilst drawing a line it adds a point
18 - run lint
21 - add undo & redo built-in
21a  - stop it rendering 3 times per state change
23 - move initialization tasks into an init function (allowing people to modify it before init)
23a - also refactor all the code, try to split into mulitlpe files
27 - remove these 3 from drawShape (they are global)
          g_wholeThing,
          dragHandler,
          svg,
23b - remove legacy CSS
23c - name css classes properly (not svg all)
23d - why is it black in dark mode / incognito?
28 - package it ready to go to npm
26 - when a wire is clicked highlight what it's connected too
24 - in touch screen, can users cancel drawing a line? - They can double tap
32 - remove drag handler when mouse over connector
39a - when an item is dropped then make it selected
31 - Undo also changes wire
29 - import it into other project where we recreate circuit solver
31c - Must move wires back down the stack when deselectall occurs. Otherwise clicking on connectors get harder
31a - Wire elbows can be moved
31b - draw2d has a nice way of deciding when to move elbows
31e - when shape is draggged, move elbos on same x or y as connector (deprecate the null thing)
36 - phone screen zoom out keeps messing up the Y
36a - don't use a white background so user knows where to click & scroll
40 - enable drag of connectors. it's just intuitive
46 - remove drag handlers when mouse is over anything (wires particularly)
47  -make the default font nicer
49 - wires are too ahrd to click on laptop!
30 - handle window resizing
53 - Add clickdistance - this makes accidental dragging a non-issue
-- 50 - if drag end fires and mouse has not moved one space, fire a click
35 - undo supports delete with wires
35a - Undo should be able to restore multiple objects deleted
35b - Undo can handle re-drawing wires elbows
39 - capture ctrl-z
51 - move elbos to d3.drag() so they work on touch
54 - Must move to a fixed width at maximum zoom. Currently opening same site on phone and laptop will have different svg size, then some objects can be off grid...
52 - touchend doesn't have the hover hoverConnector because theres no "touchover". Will have to move to a lut based hover?
Add elbow to dragging wire
Make connector expand when hover over
line between snowman connectors have an elbow?
- d3 pan tolerance higher? so that if use clicks and moves one pixel it doesn't throw away the click?
17a - may be solved by 17 - if user draws a right-angle then instead of storing null, store start and end. so the angle will move x and y
33a - create example with the circuit drawing
-- Add shape labels, check it's OK with rotate, then I think we're ready!
61 - change css classes to start with visiojs
64 - eliminate svgref?

## Decided not to do
-- becaue you can either mousedown and drag, or click and then click again. I think 2x click is easier
7b - change on click to on mouse down - so you can drag lines out of the connectors

--because cursor = pointer seems to solve this?
19 - smarter handling of click vs mousedown, so we don't get the missed clicks when dragging

--Can't recreate. Maybe was a pointer re0use issue
25 - sometimes the wire is jumping between dogs??

-- because other tools don't do this. Just do what draw2d does
39 - when you click a shape, select all it's wires too, and drag them together

-- because undo saves the day (now it works well)
48 - multi select not working well - change it to requiring ctrl or cmd