
function UpDateAll(){

    GetCornerPolyline();
    CalculateCorners();
    //console.log("Cnr in update", CnrPt[1].lat())
    MakeRoute();
    //console.log("done makeroute");
    DrawRoute();
    SetMarkers();
}

function MarkerDrag(MarkNum, MarkPos){ // this will set ArcCtre to the new marker posn, and does the curve calculations
    //console.log("marker dragged", MarkNum, MarkPos.lat(), MarkPos.lng());
    AdjustCurve(MarkNum, MarkPos);
    CalculateCorners();
    MakeRoute();
    DrawRoute();
}

function MarkerDragFinished(MarkNum, MarkPos){ // this will redraw the markers to suit the new legal ArcCtre positions
    //console.log("marker finished", MarkNum, MarkPos.lat(), MarkPos.lng());
    AdjustCurve(MarkNum, MarkPos);
    CalculateCorners();
    MakeRoute();
    DrawRoute();
    SetMarkers();
}


google.load('visualization', '1', {packages: ['columnchart']});

function displayPathElevation(path, elevator, map) {

  // Create a PathElevationRequest object using this array.
  // Ask for 256 samples along that path.
  // Initiate the path request.
  elevator.getElevationAlongPath({
    'path': path,
    'samples': 256
  }, plotElevation);
}

// Takes an array of ElevationResult objects, draws the path on the map
// and plots the elevation profile on a Visualization API ColumnChart.
function plotElevation(elevations, status) {
  const chartDiv = $('#elevation_chart')[0];
  if (status !== 'OK') {
    // Show the error code inside the chartDiv.
    chartDiv.innerHTML = 'Cannot show elevation: request failed because ' +
        status;
    return;
  }
  // Create a new chart in the elevation_chart DIV.
  const chart = new google.visualization.ColumnChart(chartDiv);

  // Extract the data from which to populate the chart.
  // Because the samples are equidistant, the 'Sample'
  // column here does double duty as distance along the
  // X axis.
  const data = new google.visualization.DataTable();
  data.addColumn('string', 'Sample');
  data.addColumn('number', 'Elevation');
  for (let i = 0; i < elevations.length; i++) {
    data.addRow(['', elevations[i].elevation]);
  }

  // Draw the chart using the data within its DIV.
  chart.draw(data, {
    height: 150,
    legend: 'none',
    titleY: 'Elevation (m)'
  });
}


// Handles click events on a map, adds a new point to the Polyline and updates elevation graph.
function addLatLng(event) {
  var path = CornerPoly.getPath();
  // Because path is an MVCArray, we can simply append a new coordinate
  // and it will automatically appear.
  path.push(event.latLng);
 // Send new route to backend 
  updateRoute();
}


function AdjustCurve(MarkNum, MarkPos){ //Adjusts the curve radius when the handle is moved by the mouse
    // note that the curve handle is always 20 pixels from the edge of the arc
    // so it can be moved even if the radius is zero
    MPerPix = 95 * 1024/Math.pow(2, map.getZoom());// scale is 95 for zoom = 10, when 2^10 = 1024
    HandleOffsetM = HandleFromCurve * MPerPix; // 20 pix
    HalfAng = (180 - CnrAngChange[MarkNum]) / 2; // angle between line and bisector
    HalfSin = Math.sin(degRad(HalfAng));
    MouseToPtM = google.maps.geometry.spherical.computeDistanceBetween(CnrPt[MarkNum], MarkPos); //distance of the mouse from the corner point in M
    NewArcToPt = MouseToPtM - HandleOffsetM;
    CnrSetRadZero[MarkNum] = false;
    // print ("new arc to pt", NewArcToPt)
    if (NewArcToPt > 0){
        NewRad = NewArcToPt / (1 - HalfSin);
    }
    else {
        CnrSetRadZero[MarkNum] = true;
        console.log("setting radzero");
        NewRad = 0;
    } // if the mouse is closer to the point than 20 pixels, rad = 0
    if (NewRad < MinRadius) NewRad = 0; // dont allow tiny radius, just set it to zero
    //console.log("rad was", CnrRadius[MarkNum], "NewRad", NewRad);
    CnrRadius[MarkNum] = NewRad;
 }

function MakeRadSegments (Ctre, StartAng, AngChge, Rad) {
    //this constructs a number of arc segments around a given point
    // the number and spacing of the segements is calculated from the minimums
    // it ends up making calls to MakeLine, which either adds points to the route array, or the speed array
    ArcDist = Math.abs(2 * Math.PI * Rad * AngChge / 360);
    NumSegsByDist = Math.round(Math.abs(ArcDist / MinDrawSegLgth));
    NumSegsByAngle = Math.round(Math.abs(AngChge / MinSegmentAngle));
    NumSegs = NumSegsByDist;
    if (NumSegs < NumSegsByAngle) NumSegs = NumSegsByAngle;
    if (NumSegs < 3) NumSegs = 3;
    for (var i = 1; i < NumSegs + 1; i++){
        ang = StartAng + i * AngChge / NumSegs;
        SegPt = google.maps.geometry.spherical.computeOffset(Ctre, Rad, ang);
        MakeLine(SegPt); // makes a line segment. -2 indicates not to make a speed array here
    }
}

function MakeLine(ThisPt) { // adds this line to the route array for drawing later
    // inputs this point and the prev point to calc the distance for the speed array
    Rpoly[NumRoutePts] = ThisPt;
    NumRoutePts +=1;
}

function MakeRoute() { // scans thru all the lines and makes the route array
    // some lines have radii, and the route lines only go to the tangent points
    //the same function also makes the speed array, do a second pass with DoSpeedArray true
    NumRoutePts = 1;
    MakeLine(CnrPt[1]); // first point
    for (var a = 2; a < NumCorners + 1; a++){
        if ((CnrRadius[a - 1] === 0) && (CnrRadius[a] === 0)){
            MakeLine(CnrPt[a]); // draw full-length line. Rad = 0 indicates a stop
        }
        else if ((CnrRadius[a - 1] === 0) && (CnrRadius[a] > 0)) {
            MakeLine(CnrTan1[a]); // draw line from prev pt to Tangent1
            MakeRadSegments(CnrArcCtre[a], CnrArcAng1[a], CnrAngChange[a], CnrRadius[a]);
        }
        else if ((CnrRadius[a - 1] > 0) && (CnrRadius[a] === 0)) {
            MakeLine(CnrPt[a]); // draw from prev Tan2 to next point
        }
        else if ((CnrRadius[a - 1] > 0) && (CnrRadius[a] > 0)) {
            MakeLine(CnrTan1[a]); // draw from prev Tan2 to this Tan1
            MakeRadSegments(CnrArcCtre[a], CnrArcAng1[a], CnrAngChange[a], CnrRadius[a]);
        }
    }
}

function MakeCurve(a){ // this is calculating the arc for the corner radius. Sets the construction pts in Cnr[a]
    //console.log("make curve", a, " ", CnrRadius[a]);
    if (CnrRadius[a] === 0) {
        CnrRadius[a] = DefaultRadius;
    }
    HalfLineBefore = 0.45 * google.maps.geometry.spherical.computeDistanceBetween(CnrPt[a - 1], CnrPt[a]); // need the half line length to restrict the radius size
    HalfLineAfter = 0.45 * google.maps.geometry.spherical.computeDistanceBetween(CnrPt[a], CnrPt[a + 1]); // the 0.45 is to leave a little line in the middle
    MaxTangLength = Math.min(HalfLineBefore, HalfLineAfter);
    TangentDist = CnrRadius[a] * Math.abs(Math.tan(degRad(CnrAngChange[a] / 2))); // this is the distance from the point to the tangent
    if (TangentDist > MaxTangLength) { //tangent dist is too long, so reduce the radius and re-calculate
        CnrRadius[a] = CnrRadius[a] * MaxTangLength / TangentDist;
        TangentDist = CnrRadius[a] * Math.abs(Math.tan(degRad(CnrAngChange[a] / 2)));
    }
    CnrTan1[a] = google.maps.geometry.spherical.computeOffset(CnrPt[a], TangentDist, reverseAngle(CnrAngIn[a])); // reverse because its back along the line
    CnrTan2[a] = google.maps.geometry.spherical.computeOffset(CnrPt[a], TangentDist, CnrAngIn[a + 1]); // using the angle for the next point so noneed to reverse
    PtToArcCtre = Math.sqrt(Math.pow(TangentDist,2) + Math.pow(CnrRadius[a],2)); // use pythag to find the length of the line from the point to the arc center
    CnrArcCtre[a] = google.maps.geometry.spherical.computeOffset(CnrPt[a], PtToArcCtre, CnrBisAng[a]); // set the arc centre x and y
    var OffPt = google.maps.geometry.spherical.computeOffset(CnrPt[a], PtToArcCtre, 180);
    CnrArcAng1[a] = google.maps.geometry.spherical.computeHeading(CnrArcCtre[a], CnrTan1[a]); // find the angle of the line from the arc ctre to the first tangent
    CnrArcAng2[a] = google.maps.geometry.spherical.computeHeading(CnrTan2[a], CnrArcCtre[a]); // second tangent
    MPerPix = 95 * 1024/Math.pow(2, map.getZoom());// scale is 95 for zoom = 10, when 2^10 = 1024
    HandleOffsetM = HandleFromCurve * MPerPix; // 20 pix
    CurveHandLgth = PtToArcCtre - CnrRadius[a] + HandleOffsetM;// the distance of the handle from the point
    CnrCurveHandle[a] = google.maps.geometry.spherical.computeOffset(CnrPt[a], CurveHandLgth, CnrBisAng[a]);

}


function CalcAngles(a) {
    // calc the angle change from one line to another. The sign shows the direction, +ve is clockwise
    // Zero = both lines are in the same direction
    AngChange = CnrAngIn[a + 1] - CnrAngIn[a];

    if (AngChange > 180) AngChange = AngChange - 360;
    else if (AngChange < -180) AngChange = AngChange + 360;

    if (AngChange >= 0) BisAng = CnrAngIn[a] + 90 + AngChange / 2; // now calc the angle of the bisector between the lines
    else BisAng = CnrAngIn[a] - 90 + AngChange / 2;

    if (BisAng > 360) BisAng = BisAng - 360;
    else if (BisAng < 0) BisAng = 360 + BisAng;

    CnrAngChange[a] = AngChange;
    CnrBisAng[a] = BisAng;
}

function CalculateCorners() {
    for (var a = 2; a < NumCorners + 1; a++) { // calc the angle of each line, AngIn. Angle is towards the point
        CnrAngIn[a] = google.maps.geometry.spherical.computeHeading(CnrPt[a-1], CnrPt[a]);
    }
    for (a = 2; a < NumCorners; a++){
        // Calc Bisector angle of the line that bisects the lines at a point, the arc center is on this line
        CalcAngles(a);
        console.log("decision CnrSetRadZero = ", CnrSetRadZero[a], (Math.abs(CnrAngChange[a]) > 10),(CnrSetRadZero[a] !== true) );
        if ((Math.abs(CnrAngChange[a]) > 10) && (CnrSetRadZero[a] !== true)) { //dont do tight angles or when we have set a stop
            MakeCurve(a); // now do the curve calculations
        }
        else CnrRadius[a] = 0
    }
}


function GetCornerPolyline() { //Makes the corner array points lat and long from the original polyline
    console.log(" --------");
    var NewPath = CornerPoly.getPath();
    NumCorners = NewPath.length;
    var x;
    var y;
    CnrRadius[0] = 0;
    //CnrSetRadZero[0] = false;
    for (var i = 0; i < NumCorners; i++) {  //Google polyline stars from zero and go to path.length - 1
        y = NewPath.getAt(i).lat();
        x = NewPath.getAt(i).lng();
        //console.log("in get y,x", y, x, "type", typeof(y));
        CnrPt[i + 1] = new google.maps.LatLng(y, x); // our corners start from number 1 and go to NumCorners
        CnrRadius[i + 1] = 0;
    }
}


function DrawRoute(){ //takes the route array, and draws the new polyline on the map
    RoutePts = [];
    for (i = 0; i < NumRoutePts - 1; i++) {
        y = Rpoly[i + 1].lat();
        x = Rpoly[i + 1].lng();
        RoutePts[i] = new google.maps.LatLng(y, x);
    }
    RouteLine.setPath(RoutePts);
}


function SetMarkers(){ // Sets the posotion of the curve handle markers on the arc centers, and set the listeners for them
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
    var x;
    var y;

    for (i = 2; i < NumCorners; i++) { //markers zIndex is the same as the corners, first one is #2
        marker = new google.maps.Marker({
            position: CnrCurveHandle[i],//MyLatLng,
            draggable: true,
            map: map,
            zIndex: i, //this is the index number of the marker when clicked, same as corner
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 3,
                strokeColor: "red"
            }
        });
        markers.push(marker);

        google.maps.event.addListener(marker, "drag", function(){
            MarkerDrag(this.zIndex, this.getPosition());
            //console.log("marker id", this.zIndex, "pos", MarkPos.lat());
         });

        google.maps.event.addListener(marker, "dragend", function(){
            MarkerDragFinished(this.zIndex, this.getPosition());
        });
    }

}


function radDeg(r){// we use degrees for all angles. This converts radians to degrees
    var d = r * 180 / Math.PI;
    return (d);
}

function degRad(d){ // coverts degrees to radians for the trig functions
    var r = d * Math.PI / 180;
    return (r);
}

function reverseAngle (ang) { // used mainly for looking at the angle of a line out of a point, use the next point's AngIn and reverse
    ang = 180 + ang
    if (ang > 360) ang = ang - 360 // watch for angles that pass zero/360
    return (ang);
}


// Call backend service and update values
function updateRoute(event){

  displayPathElevation(RouteLine.getPath().getArray(), elevator, map);

  var length = RouteLine.inM()
  document.getElementById('length').value = length/1000

  var xhr = new XMLHttpRequest();
  var url = "https://euroloop-route.herokuapp.com/request";
  xhr.open("POST", url, true);

  var vel = parseInt( document.getElementById('vel').value )
  var throughput = parseInt( document.getElementById('throughput').value )
  var diameter = parseFloat( document.getElementById('diameter').value )
  var loadingtime = parseFloat( document.getElementById('loadingtime').value )

  var data = JSON.stringify({"length": length, "velocity": vel, "throughput": throughput, "diameter": diameter, "loadingtime": loadingtime});

  xhr.onreadystatechange = function() {//Call a function when the response is received.
      if(xhr.readyState == 4 && xhr.status == 200) {
          console.log(xhr.responseText);
          var jsonResponse = JSON.parse(xhr.responseText);
          document.getElementById('nrPods').value = jsonResponse.nrpods
          document.getElementById('traveltime').value = jsonResponse.traveltime
          document.getElementById('capex').value = jsonResponse.capex/1000000
      }
  }
  xhr.send(data);
}

function initialize() { // All the setup for the maps, polyines etc. Also the listeners.

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 7,
        center: new google.maps.LatLng(52.12, 21.00),
        mapTypeId: 'terrain'
    });

    CornerPoly = new google.maps.Polyline({ //Dont use var here because it a global
        editable: true,
        strokeColor: 'grey', //was #FF0000
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
    });


    //console.log("before DrawInitRoute", RoutePts[2].lat());
    RouteLine = new google.maps.Polyline({ //Dont use var here because it a global
        editable: false,
        strokeColor: 'red',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
    });

    var deleteMenu = new DeleteMenu();

    google.maps.event.addListener(CornerPoly.getPath(), 'set_at', UpDateAll); //GetCornerPolyline);
    google.maps.event.addListener(CornerPoly.getPath(), 'insert_at', UpDateAll); //GetCornerPolyline);

    google.maps.event.addListener(CornerPoly, 'rightclick', function(e) {
        // Check if click was on a vertex control point
        console.log("delete listener")
        if (e.vertex == undefined) {
            return;
        }
        deleteMenu.open(map, CornerPoly.getPath(), e.vertex);
    });

    // Add a listener for the click event to add new vertexes
    map.addListener('click', addLatLng);

    CornerPoly.addListener('click', function(event){
        if(event.vertex != null){
            var path = this.getPath();
            path.removeAt(event.vertex);
            UpDateAll();
            updateRoute();
        }
    });


    //CnrPt = new Array(PtLatLong);
    CnrPt = new Array(google.maps.LatLng(10,10));
    CnrAngIn = new Array(0); // the heading of the line toward the point
    CnrAngChange = new Array(0); //the angle to the next line
    CnrBisAng = new Array(0); //bisector angle heading towards the point
    CnrTan1 = new Array(google.maps.LatLng(10,10));
    CnrTan2 = new Array(google.maps.LatLng(10,10));
    CnrArcCtre = new Array(google.maps.LatLng(10,10));
    CnrArcAng1 = new Array(0); //angle of the firts tangent point rel to the arc center
    CnrArcAng2 = new Array(0);
    CnrCurveHandle = new Array(google.maps.LatLng(10,10));
    CnrRadius = new Array(0); //radius of the corner curve
    //var CnrMaxRadius = 0; //to fit inside the line half
    CnrSetRadZero = new Array(false);

    ArrayLatLng = new Array(google.maps.LatLng(10, 10));

    RoutePts = new Array(google.maps.LatLng(10,10)); //new Array(google.maps.LatLng(10, 10));

    Rpoly = new Array(google.maps.LatLng(10,10));

    google.maps.LatLng.prototype.kmTo = function(a){
        var e = Math, ra = e.PI/180;
        var b = this.lat() * ra, c = a.lat() * ra, d = b - c;
        var g = this.lng() * ra - a.lng() * ra;
        var f = 2 * e.asin(e.sqrt(e.pow(e.sin(d/2), 2) + e.cos(b) * e.cos(c) * e.pow(e.sin(g/2), 2)));
        return f * 6378.137;
    }

    google.maps.Polyline.prototype.inM = function(n){
        var a = this.getPath(n), len = a.getLength(), dist = 0;
        for(var i=0; i<len-1; i++){
            dist += a.getAt(i).kmTo(a.getAt(i+1));
        }
        return Math.trunc(dist * 1000);
    }

    // Create an ElevationService.
    elevator = new google.maps.ElevationService;

    //UpdateAll(); not working??
}

/**
 * A menu that lets a user delete a selected vertex of a path.
 * @constructor
 */
function DeleteMenu() {
    this.div_ = document.createElement('div');
    this.div_.className = 'delete-menu';
    this.div_.innerHTML = 'Delete';

    var menu = this;
    google.maps.event.addDomListener(this.div_, 'click', function() {
        menu.removeVertex();
    });
}

//===============      Global Variables start here ================================

var map; //declare this here to make map a global
var RouteLine = [];
var CornerPoly = [];
var markers = [];

var NumCorners = 0;
var NumRoutePts = 0;

var DefaultRadius = 40000 // the radius when we make a new vertex. may end up smaller to fit the line
var MinRadius = 500 // dont allow for small radii
var MinSegmentAngle = 10 // the mimimum angle for the curve segment lines.
var MinDrawSegLgth = 1000 //the min length of a segment
var MinSpeedLineLgth = 200// the distance apart of the speed array points. Speed will be calc for each distance
var HandleFromCurve = 20//pixels distance from the curve edge
DeleteMenu.prototype = new google.maps.OverlayView();

DeleteMenu.prototype.onAdd = function() {
    var deleteMenu = this;
    var map = this.getMap();
    this.getPanes().floatPane.appendChild(this.div_);

    // mousedown anywhere on the map except on the menu div will close the
    // menu.
    this.divListener_ = google.maps.event.addDomListener(map.getDiv(), 'mousedown', function(e) {
        if (e.target != deleteMenu.div_) {
            deleteMenu.close();
        }
    }, true);
};

DeleteMenu.prototype.onRemove = function() {
    google.maps.event.removeListener(this.divListener_);
    this.div_.parentNode.removeChild(this.div_);

    // clean up
    this.set('position');
    this.set('path');
    this.set('vertex');
};

DeleteMenu.prototype.close = function() {
    this.setMap(null);
};

DeleteMenu.prototype.draw = function() {
    var position = this.get('position');
    var projection = this.getProjection();

    if (!position || !projection) {
        return;
    }

    var point = projection.fromLatLngToDivPixel(position);
    this.div_.style.top = point.y + 'px';
    this.div_.style.left = point.x + 'px';
};

/**
 * Opens the menu at a vertex of a given path.
 */
DeleteMenu.prototype.open = function(map, path, vertex) {
    this.set('position', path.getAt(vertex));
    this.set('path', path);
    this.set('vertex', vertex);
    this.setMap(map);
    this.draw();
};

/**
 * Deletes the vertex from the path.
 */
DeleteMenu.prototype.removeVertex = function() {
    var path = this.get('path');
    var vertex = this.get('vertex');

    if (!path || vertex == undefined) {
        this.close();
        return;
    }

    path.removeAt(vertex);
    this.close();
};

google.maps.event.addDomListener(window, 'load', initialize);

function toggleSettings() {
    const settings = $('#settings');
    settings.toggleClass('hidden');
    const chart = $('#elevation_chart');
    const mapContainer = $('#mapcontainer');
    if (!chart.hasClass('hidden') && !settings.hasClass('hidden')) {
        mapContainer.addClass('all-shown');
    } else {
        mapContainer.removeClass('all-shown');
    }
    setTimeout(function() {
        updateRoute();
    }, 700);
    setTimeout(function() {
        google.maps.event.trigger(map, 'resize');
    }, 1100);
}

function toggleChart() {
    const mapContainer= $('#map');
    mapContainer.toggleClass('chart-shown');
    const chart = $('#elevation_chart');
    chart.toggleClass('hidden');
    if (!chart.hasClass('hidden')) {
        setTimeout(function() {
           updateRoute();
        }, 700);
    }
    setTimeout(function() {
        google.maps.event.trigger(map, 'resize');
    }, 1100);
}
