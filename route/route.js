
function initialize() { // All the setup for the maps, polyines etc. Also the listeners.
    google.charts.load('current', {'packages':['line','corechart']});

    DoBattChart = false;
    DoSpeedChart = true;

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
    google.maps.event.addListener(CornerPoly.getPath(), 'insert_at', function(event){
    
        for(i=NumCorners; i>event; i--){
            CnrRadius[i] = CnrRadius[i-1] //move radii to correct spot in array
        }
        UpDateAll()    
    }); //GetCornerPolyline);

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
            adjustRadii(event.vertex) //move radii to correct spot in array
            CnrRadius[0] = 0;
            CnrRadius[1] = 0;
            if(event.vertex == NumCorners-1){
                CnrRadius[NumCorners-1] = 0 //if last vertex in path is deleted
            }

            UpDateAll();
            updateRoute();
        }
    });

    function adjustRadii(vertex){
        for(i=vertex+1; i<NumCorners; i++){
            CnrRadius[i] = CnrRadius[i+1]
        }
    }

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

function UpDateAll(){
        Pod[1].DoChart = 1;
        Pod[2].DoChart = 0;
        Pod[3].DoChart = 0;
        Pod[4].DoChart = 0;
        Pod[5].DoChart = 0;

    console.log("Update all")

    ArrangePodsToChart();
    GetCornerPolyline();
    CalculateCorners();
    //console.log("Cnr in update", CnrPt[1].lat())
    MakeRoute();
    //console.log("done makeroute");
    DrawRoute();
    SetMarkers();

    MakeCharts();
}

function MarkerClick(MarkNum, MarkPos){ // this will set ArcCtre to the new marker posn, and does the curve calculations
    //console.log("marker dragged", MarkNum, MarkPos.lat(), MarkPos.lng());
    document.getElementById('curveradius').value = CnrRadius[MarkNum]
    SelectMarker = MarkNum;
}

function MarkerDrag(MarkNum, MarkPos){ // this will set ArcCtre to the new marker posn, and does the curve calculations
    //console.log("marker dragged", MarkNum, MarkPos.lat(), MarkPos.lng());
    AdjustCurve(MarkNum, MarkPos);
    CalculateCorners();
    MakeRoute();
    DrawRoute();
    document.getElementById('curveradius').value = CnrRadius[MarkNum]
    SelectMarker = MarkNum;
}

function MarkerDragFinished(MarkNum, MarkPos){ // this will redraw the markers to suit the new legal ArcCtre positions
    //console.log("marker finished", MarkNum, MarkPos.lat(), MarkPos.lng());
    AdjustCurve(MarkNum, MarkPos);
    CalculateCorners();
    MakeRoute();
    DrawRoute();
    SetMarkers();
}

function setRadius(){
    CnrRadius[SelectMarker] = document.getElementById('curveradius').value

    //AdjustCurve(MarkNum, MarkPos);
    CalculateCorners();
    MakeRoute();
    DrawRoute();
    SetMarkers();
}

google.load('visualization', '1', {packages: ['columnchart']});


    function ArrangePodsToChart() { //scans the pods, and makes number to chart 1 to 3
        NumPodsToChart = 0;
        for (p = 1; p < NumPods + 1; p++) {
            if (Pod[p].DoChart === 1) {
                if (NumPodsToChart < 3) {
                    NumPodsToChart += 1;
                    ChartPod[NumPodsToChart] = p;
                }
                else {
                    Pod[p].DoChart = 0; // turn it off if there are too many
                }
            }
        }
        if (NumPodsToChart === 0) { // make the first one active if none set
            NumPodsToChart = 1;
            Pod[1].DoChart = 1;
            ChartPod[1] = 1;    //returns a list of 3 pod numbers to be charted.
        }
    }

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
  const chartDiv = $('#ChartDiv1')[0];
  if (status !== 'OK') {
    // Show the error code inside the chartDiv.
    chartDiv.innerHTML = 'Cannot show elevation: request failed because ' +
        status;
    return;
  }
  // Create a new chart in the elevationChartDiv DIV.
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
   CurveHandleLgth = google.maps.geometry.spherical.computeDistanceBetween(CnrPt[MarkNum], MarkPos); //distance of the mouse from the corner point in M
   ArcEdgeToPt = CurveHandleLgth - HandleOffsetM;
   CnrSetRadZero[MarkNum] = false;
   if (ArcEdgeToPt > 0){
       NewRad = HalfSin * ArcEdgeToPt / (1 - HalfSin);
       if (NewRad > MinRadius) CnrRadius[MarkNum] = NewRad;
       else CnrRadius[MarkNum] = MinRadius;
   }
   else {
        console.log("Set radius zero")
       CnrSetRadZero[MarkNum] = true;
       CnrRadius[MarkNum] = 0;
   }
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
    //console.log("Ang change " + a + ": " + AngChange)
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
        //console.log("decision CnrSetRadZero = ", CnrSetRadZero[a], (Math.abs(CnrAngChange[a]) > 1),(CnrSetRadZero[a] !== true) );
        if ( (CnrSetRadZero[a] !== true)) { //dont do tight angles or when we have set a stop
            MakeCurve(a); // now do the curve calculations
        }
        else {
            console.log("CC set radius zero")
            CnrRadius[a] = 0
        }
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
        if (!CnrRadius[i + 1] > 0){
            CnrRadius[i + 1] = 0;
        }
    }
    CnrRadius[NumCorners+1] = 0
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

        google.maps.event.addListener(marker, "click", function(){
            MarkerClick(this.zIndex, this.getPosition());
            //console.log("marker id", this.zIndex, "pos", MarkPos.lat());
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


function MakeCharts(){
        console.log ("pods", NumPodsToChart, ChartPod);
        MakeSectionsFromRoute(); // makes one section for each line, and one for each radius, each with the distance and radius
                                // it then converts each section into a number of segments of the required length for the speed calcs
        ThisPod = p = 0;
        for (p = 1; p < NumPodsToChart + 1; p++) {
            ThisPod = ChartPod[p];
            CalcSpeedArray(ThisPod); // calulates the speed in stages, fist the max speed re curves, then due to braking, then accel
            if (p === 1) {
                SetupSpeedChartArray(); // sets up the speed chart for the required nuber of pods
                if (DoBattChart === true) {
                    google.charts.setOnLoadCallback(DrawBattChart); // the chart with the speed and battery capacity for one pod.
                }
            }
            SpeedChartAddData(p);// adds the data for this pod to the chart array
            //PrintInfo(ThisPod); // must have divs before the script or the innerHTML gives null error.
        }
        google.charts.setOnLoadCallback(DrawSpeedChart);// draw the speed chart

    }


function MakeSectionsFromRoute() { // Scans the route and makes a set of sections
    // A section is a distance (ie line or curve circumf) with a associated radius
    // the 'Radius' of a line is 0 if there is a stop, or -1 if the line ends at a curve
    SpeedPtCount = 0;
    SectionsCount = 0;
    for (var a = 2; a < NumCorners + 1; a++) {
        if ((CnrRadius[a - 1] === 0) && (CnrRadius[a] === 0)) {
            Length = google.maps.geometry.spherical.computeDistanceBetween(CnrPt[a - 1], CnrPt[a]); //distance of the mouse from the corner point in M
            AddSection(Length, 0,1);
        }
        else if ((CnrRadius[a - 1] === 0) && (CnrRadius[a] > 0)) {
            Length = google.maps.geometry.spherical.computeDistanceBetween(CnrPt[a - 1], CnrTan1[a]); //distance of the mouse from the corner point in M
            AddSection(Length, -1,2);
            ArcDist = Math.abs(2 * Math.PI * CnrRadius[a] * CnrAngChange[a] / 360);
            AddSection(ArcDist, CnrRadius[a],3);
        }
        else if ((CnrRadius[a - 1] > 0) && (CnrRadius[a] === 0)) {
            Length = google.maps.geometry.spherical.computeDistanceBetween(CnrTan2[a - 1], CnrPt[a]); //distance of the mouse from the corner point in M
            AddSection(Length, 0,4);
        }
        else if ((CnrRadius[a - 1] > 0) && (CnrRadius[a] > 0)) {
            Length = google.maps.geometry.spherical.computeDistanceBetween(CnrTan2[a - 1], CnrTan1[a]); //distance of the mouse from the corner point in M
            AddSection(Length, -1,5);
            ArcDist = Math.abs(2 * Math.PI * CnrRadius[a] * CnrAngChange[a] / 360);
            AddSection(ArcDist, CnrRadius[a],6);
        }
    }
    MakeSegmentArray();// divides up each segment into short lengths for the speed calcs
}

function AddSection (Len, Rad, Typ) {
    SectionsCount += 1;
    SectsLen[SectionsCount] = Len;
    SectsRad[SectionsCount] = Rad;
}


function MakeSegmentArray() { //we take the sections, which may be long lines,
    // Then divide the long lines into short segments. Each has a length and an associated radius
    // Part of a straight line will usually have rad = -1, or rad = 0 if there is a stop.
    SegmentCount = 0;
    for (var i = 1; i < SectionsCount + 1; i++) {
        Length = SectsLen[i];
        Rad = SectsRad[i];
        NumSegs = 1 + Math.round(Length / MinSpeedLineLgth);
        //NumSegs = 5;// do this to make a test route with few sections
        step = Length / NumSegs;
        for (var j = 1; j < NumSegs + 1; j++) {
            SegmentCount += 1;
            SegLength[SegmentCount] = step;
            if ((Rad === 0) && (j !== NumSegs)) SegRadius[SegmentCount] = -1;
            else SegRadius[SegmentCount] = Rad;
        }
    }
}


function CalcSpeedArray(ThisPod) { //This is a staged process that scans the whole route segments, and works out the limited speed
    RouteDist[0] = 0;
    TotDist = 0;
    TravelTime = 0;
    for (var i = 1; i < SegmentCount + 1; i++) {
        // makes a stepped graph of speed at max speed and speed limited by the curve radius.
        TotDist += SegLength[i];
        RouteDist[i] = RouteDist[i - 1] + SegLength[i];
        CurveSpeed = Pod[ThisPod].MaxSpeed;
        if (SegRadius[i] !== -1) {
            CurveSpeed = Math.sqrt(SegRadius[i] * Pod[ThisPod].MaxCornerMss);
        }
        SpeedMax[i] = Math.min(Pod[ThisPod].MaxSpeed, CurveSpeed);//put the stepped speeds into Speed[0]
    }

    InitSpeed = 0; //starting speed m/s
    Times2 = 0;
    for (i = SegmentCount; i > 0; i--) { // does a speed run from the finish, to get the braking profile
        SpeedComputation(InitSpeed, SpeedMax[i], SegLength[i], ThisPod, "Decel");
        RevEnergy[i] = EnergyThisSeg;
        RevSegTime[i] = TimeForSeg;
        Times2 = Times2 + TimeForSeg;
        RevSpeed[i] = SpeedAtEnd;
        InitSpeed = SpeedAtEnd;
    }
    RevSpeed[0] = 0;
    RevSegTime[0] = 0;
    RevEnergy[0] = 0;

    InitSpeed = 0;
    Times3 = 0;
    for (i =1; i < SegmentCount + 1; i++) { // does a speed run from the start
        SpeedComputation(InitSpeed, SpeedMax[i], SegLength[i], ThisPod, "Accel");
        FwdSpeed[i] = SpeedAtEnd;
        FwdSegTime[i] = TimeForSeg;
        Times3 = Times3 + TimeForSeg;
        FwdEnergy[i] = EnergyThisSeg;
        InitSpeed = SpeedAtEnd;
    }
    FwdSpeed[0] = 0;
    FwdSegTime[0] = 0;
    FwdEnergy[0] = 0;

    TotTot = 0;
    TotTime = 0;
    EnergyKj = 0;
    for (i = 1; i < SegmentCount + 1; i++) { // compares the forward and reverse speeds, and chooses the slower.
        if (RevSpeed[i] <= FwdSpeed[i]){
            FinalSpeed[i] = RevSpeed[i];
            FinalEnergy[i] = RevEnergy[i];
            FinalSegTime[i] = RevSegTime[i];
        }
        else {
            FinalSpeed[i] = FwdSpeed[i];
            FinalEnergy[i] = FwdEnergy[i];
            FinalSegTime[i] = FwdSegTime[i];
        }
        if (SpeedMax[i] === 0) FinalSegTime[i] = 10; //Pause at stop
        TotTime += FinalSegTime[i];
        RouteTime[i] = TotTime;
        EnergyKj += FinalEnergy[i];
    }
    document.getElementById('traveltime').value = Math.floor(TotTime)
    
    FinalSpeed[0] = 0;
    MaxBattery = 0;
    BatterykWHr = 0;
    FinalEnergy[1] = 0;
    for (i = 2; i < SegmentCount + 1; i++) { // Calcs the battery power, and finds the max discharge
        BatterykWHr = FinalEnergy[i] / 3600;
        FinalEnergy[i] = FinalEnergy[i - 1] + BatterykWHr; //this is the battery capacity used.
        MaxBattery = Math.max(MaxBattery, FinalEnergy[i-1]); // this is the max value of battery capacity
    }

}

// This calculates the speed in short sections, working out the increase of speed from the previous values
// Braking is calc by doing accelerartion along the route form the finish, but the drag no adds to the accel, and reduces the energy
function SpeedComputation(InitSpeed, TargetSpeed, SegDist, ThisPod, AccelType) {
    if (InitSpeed === 0) InitSpeed = 5; //give a value to avoid div by zero later
    AeroDrag = Pod[ThisPod].AeroDrag * Math.pow(InitSpeed / Pod[ThisPod].MaxSpeed, 2);
    TireDrag = Pod[ThisPod].Mass / Pod[ThisPod].TireLiftDrag * 9.81;
    TotDrag = AeroDrag + TireDrag;
    if (InitSpeed === TargetSpeed) { // just cruising
        TimeForSeg = SegDist / InitSpeed;
        EnergyThisSeg = TotDrag * InitSpeed * TimeForSeg / Pod[ThisPod].MotorEff / 1000;
        SpeedAtEnd = InitSpeed
    }
    else {
        // calc the power if we accel at the max rate of 0.3G
        if (AccelType === "Accel") {
            ThrustLimAccel = TotDrag + Pod[ThisPod].MaxAccelMss * Pod[ThisPod].Mass;
            MaxMotorPwr = Pod[ThisPod].MaxPower
        }
        else if (AccelType === "Decel") {
            ThrustLimAccel = TotDrag - Pod[ThisPod].MaxAccelMss * Pod[ThisPod].Mass;
            MaxMotorPwr = - Pod[ThisPod].MaxPower // regen braking
        }
        MotorPwrLimAccel = ThrustLimAccel * InitSpeed / 1000;
        // Now calc the accel rate if limited by max motor power
        MaxMotorThrust = MaxMotorPwr * 1000 / InitSpeed;
        MaxThrust = MaxMotorThrust - TotDrag;
        AccelRateMaxPwr = Math.abs(MaxThrust / Pod[ThisPod].Mass);
        // now choose the lower of the two accel rates
        if (AccelRateMaxPwr > Pod[ThisPod].MaxAccelMss) {
            AccelRateUsed = Pod[ThisPod].MaxAccelMss;
            Power = MotorPwrLimAccel;
        }
        else {
            AccelRateUsed = AccelRateMaxPwr;
            Power = MaxMotorPwr;
        }
        TimeForSeg = ((Math.sqrt(Math.pow(InitSpeed, 2) + 2 * AccelRateUsed * SegDist)) - InitSpeed) / AccelRateUsed;
        SpeedAtEnd = InitSpeed + TimeForSeg * AccelRateUsed;

        if (AccelType === "Accel") EnergyThisSeg = Power * TimeForSeg / Pod[ThisPod].MotorEff;  // more energy on accel
        else EnergyThisSeg = Power * TimeForSeg * Pod[ThisPod].MotorEff;  // less energy on decel

        if (SpeedAtEnd > TargetSpeed) SpeedAtEnd = TargetSpeed;
    }
    TravelTime = TravelTime + TimeForSeg
}

// it is hard to add columns to a chart array, so we set it up originally with the required number of columns, 1,2, or 3
function SetupSpeedChartArray(){
    if (NumPodsToChart ===1){
        SpeedChartArray = [['Distance from start Km', Pod[ChartPod[1]].Name]];
        for (var i = 0; i < SegmentCount+1; i++) {
            SpeedChartArray.push([RouteDist[i]/1000, 0]);
        }

    }
    else if(NumPodsToChart === 2){
        SpeedChartArray = [['Distance from start Km', Pod[ChartPod[1]].Name, Pod[ChartPod[2]].Name]];
        for (var i = 0; i < SegmentCount+1; i++) {
            SpeedChartArray.push([RouteDist[i]/1000, 0, 0]);
        }

    }
    else if(NumPodsToChart === 3){
        SpeedChartArray = [['Distance from start Km', Pod[ChartPod[1]].Name, Pod[ChartPod[2]].Name, Pod[ChartPod[3]].Name]];
        for (var i = 0; i < SegmentCount+1; i++) {
            SpeedChartArray.push([RouteDist[i]/1000, 0, 0, 0]);
        }
    }
}

//This is adding the data to the column (pod) to the previously started array
function SpeedChartAddData(Col) {
    for (var i = 0; i < SegmentCount + 1; i++) {
        SpeedChartArray[i+1][Col] = FinalSpeed[i]*3.6;
    }
}

function DrawSpeedChart() {


    var SpeedDataTable = new google.visualization.DataTable();
    SpeedDataTable = google.visualization.arrayToDataTable(SpeedChartArray);

    if(RouteLine.inM() > 150000){
        console.log("LONG route")
        console.log("Rows before: " + SpeedDataTable.getNumberOfRows())
        //Reduce data by removing continuos datapoints with same value. Speeds up the graph rendering
        for (var i = 1; i < SpeedDataTable.getNumberOfRows(); i++){
            if ( SpeedDataTable.getValue(i, 1) == SpeedDataTable.getValue(i-1, 1) ){
                SpeedDataTable.removeRow(i)
            }
        }

        console.log("Rows after: " + SpeedDataTable.getNumberOfRows())
    }

    var SpeedChartOptions = {
        chart: {
            title: 'Pods speed chart vs distance'
        },
        hAxis: {textPosition : 'in'},
        vAxis: {title: "Speed km/h"},
    };
    if (DoSpeedChart){
        var SpeedChart = new google.charts.Line(ChartDiv2);
        SpeedChart.draw(SpeedDataTable, SpeedChartOptions);
    }
}


       //This is a dual axis chart for the speed of one pod, and the battery capacity.
function DrawBattChart() {
    BattChartArray = [['Time from start Mins.', Pod[ChartPod[1]].Name, 'Battery (kWHr)']];
    RouteTime[0] = 0;
    FinalEnergy[0] = 0;
    for (var i = 0; i < SegmentCount+1; i++) {
        BattChartArray.push([RouteTime[i]/60, FinalSpeed[i], MaxBattery - FinalEnergy[i]]);
    }
    var BattDataTable = new google.visualization.DataTable();
    BattDataTable = google.visualization.arrayToDataTable(BattChartArray);
    var BattChartOptions = {
        chart: {
            title: 'Speed and battery capacity chart vs trip time'
        },
        hAxis: {textPosition : 'in',
            gridlines: {color: 'transparent'}//not working, lines still there!!
        },
        series: {
            // Gives each series an axis name that matches the Y-axis below.
            0: {
                axis: 'Speed',
                gridlines: {color: 'transparent'}//not working, lines still there!!
            },
            1: {
                axis: 'Batt',
                gridlines: {color: 'transparent'}
            }
        },
        axes: {
            // Adds labels to each axis; they don't have to match the axis names.
            y: {
             //   Speed: {label: 'Speed km/h'},
             //   Batt: {label: 'Battery kWHr'}
            }
        }
    };
    if(DoBattChart){
        var BattChart = new google.charts.Line(ChartDiv2);
        BattChart.draw(BattDataTable, BattChartOptions);
    }
}



function PrintInfo(ThisPod){
        EnergyKwh = EnergyKj / 3600;
        KwhPer100k = EnergyKwh * 100 / (TotDist/1000);
        KwhPerSeat100k = KwhPer100k / Pod[ThisPod].NumPax;

        if (p ===1) document.getElementById('DataDiv').innerHTML = "<br>" ; // clear the div first time

        document.getElementById('DataDiv').innerHTML += Pod[ThisPod].Name + "<br>" ;// start writing with = and <br> for line feed
        document.getElementById('DataDiv').innerHTML += "Energy kWh " + EnergyKwh.toFixed(1) + "<br>" ;
        document.getElementById('DataDiv').innerHTML += "KwhPerSeat100k " + KwhPerSeat100k.toFixed(1) + "<br>" ;
        document.getElementById('DataDiv').innerHTML += "Battery kWh " + MaxBattery.toFixed(1) + "<br>" ;
        document.getElementById('DataDiv').innerHTML += "Distance km " + (TotDist/1000).toFixed(1) + "<br>" ;
        document.getElementById('DataDiv').innerHTML += "Time Mins " + (TotTime/60).toFixed(1) + "<br>" ;
        document.getElementById('DataDiv').innerHTML += "Avge km/h " + (TotDist/1000/TotTime * 60 * 60).toFixed(0) + "<br>" ;
        document.getElementById('DataDiv').innerHTML += "     --------  <br>";
    }


// Call backend service and update values
function updateRoute(event){

displayPathElevation(RouteLine.getPath().getArray(), elevator, map);

var length = RouteLine.inM()
document.getElementById('length').value = length/1000
Pod[1].MaxSpeed = document.getElementById('max_velocity').value / 3.6
Pod[1].MaxAccelMss = document.getElementById('accelleration').value * 9.82
Pod[1].MaxCornerMss = document.getElementById('cornering_accelleration').value * 9.82
Pod[1].MaxPower = document.getElementById('max_power').value

var xhr = new XMLHttpRequest();
var url = "https://euroloop-route.herokuapp.com/request";
xhr.open("POST", url, true);

UpDateAll()

var vel = parseInt( document.getElementById('max_velocity').value )
var throughput = parseInt( document.getElementById('throughput').value )
var diameter = parseFloat( document.getElementById('diameter').value )
var loadingtime = parseFloat( document.getElementById('loadingtime').value )

var data = JSON.stringify({"length": length, "velocity": vel, "travel_time": TotTime,  "throughput": throughput, "diameter": diameter, "loadingtime": loadingtime});

xhr.onreadystatechange = function() {//Call a function when the response is received.
  if(xhr.readyState == 4 && xhr.status == 200) {
      console.log(xhr.responseText);
      var jsonResponse = JSON.parse(xhr.responseText);
      document.getElementById('nrPods').value = jsonResponse.nrpods
      document.getElementById('capex').value = jsonResponse.capex/1000000
  }
}
xhr.send(data);

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

var SelectMarker = 0;

var DefaultRadius = 40000 // the radius when we make a new vertex. may end up smaller to fit the line
var MinRadius = 5 // dont allow for small radii
var MinSegmentAngle = 10 // the mimimum angle for the curve segment lines.
var MinDrawSegLgth = 1000 //the min length of a segment
var MinSpeedLineLgth = 200// the distance apart of the speed array points. Speed will be calc for each distance
var HandleFromCurve = 20//pixels distance from the curve edge

    var TotDist = 0;
    var SpeedAtEnd = 0;
    var TimeForSeg = 0;
    var TotTime = 0;
    var EnergyThisSeg = 0;
    var MaxBattery = 0;
    var TravelTime = 0;

    var SectionsCount = 0;
    SectsLen = new Array (0);
    SectsRad = new Array (0);

    var SegmentCount = 0;
    SegLength = new Array (0);
    RouteDist = new Array(0);
    SegRadius = new Array (0);
    SpeedMax = new Array (0); // the speed limited by curve speed and pod max speed.
    RevSpeed = new Array (0); // the speed now calc from the reverse run
    RevSegTime = new Array (0);
    RevEnergy = new Array (0);
    FwdSpeed = new Array (0);// the speed now calc from the forward run
    FwdSegTime = new Array (0);
    FwdEnergy = new Array (0);
    FinalSpeed = new Array (0);// the speed now calc from the forward run
    FinalSegTime = new Array (0);
    RouteTime = new Array(0);
    FinalEnergy = new Array (0);


    Pod = new Array(0);
    var NumPods = 5;

    Pod[1]={
        Name: "Container Freight Carrier",
        MaxSpeed: 500 / 3.6,  // m/sec
        MaxCornerMss: 9.81 * 0.5, // m/sec2
        MaxAccelMss: 9.81 * 0.25,
        Mass: 20000,
        MaxPower: 3500, // total kW for the 4 motors
        MotorEff: .85, // effciency increases used pwr on accel, reduces regeneraton
        TireLiftDrag: 150,
        AeroDrag: 500, // drag, N at max speed
        NumPax: 1,
        DoChart: 0
    };

    Pod[2]={
        Name: "Cheetah 1,000kmh 3,500kW",
        MaxSpeed: 1000 / 3.6,  // m/sec
        MaxCornerMss: 9.81 * 0.5, // m/sec2
        MaxAccelMss: 9.81 * 0.3,
        Mass: 10000,
        MaxPower: 3500, // total kW for the 4 motors
        MotorEff: .85, // effciency increases used pwr on accel, reduces regeneraton
        TireLiftDrag: 150,
        AeroDrag: 500, // drag, N at max speed
        NumPax: 27,
        DoChart: 0
    };

    Pod[3]={
        Name: "Cheetah 600kmh 2,000kW",
        MaxSpeed: 600 / 3.6,  // m/sec
        MaxCornerMss: 9.81 * 0.3, // m/sec2
        MaxAccelMss: 9.81 * 0.2,
        Mass: 10000,
        MaxPower: 2000, // total kW for the 4 motors
        MotorEff: .85, // effciency increases used pwr on accel, reduces regeneraton
        TireLiftDrag: 150,
        AeroDrag: 500, // drag, N at max speed
        NumPax: 27,
        DoChart: 0
    };

    Pod[4]={
        Name: "High speed rail",
        MaxSpeed: 200 / 3.6,  // m/sec
        MaxCornerMss: 9.81 * 0.05, // m/sec2
        MaxAccelMss: 9.81 * 0.05,
        Mass: 10000,
        MaxPower: 2000, // total kW for the 4 motors
        MotorEff: .85, // effciency increases used pwr on accel, reduces regeneraton
        TireLiftDrag: 150,
        AeroDrag: 500, // drag, N at max speed
        NumPax: 27,
        DoChart: 0
    };

    Pod[5]={
        Name: "Maglev Shanghai Transrapid",
        MaxSpeed: 400 / 3.6,  // m/sec
        MaxCornerMss: 9.81 * 0.05, // m/sec2
        MaxAccelMss: 9.81 * 0.1,
        Mass: 10000,
        MaxPower: 1000, // total kW for the 4 motors
        MotorEff: .85, // effciency increases used pwr on accel, reduces regeneraton
        TireLiftDrag: 150,
        AeroDrag: 500, // drag, N at max speed
        NumPax: 27,
        DoChart: 0
    };

    var ChartPod = new Array(0); // the list of up to 3 charts to draw
    var NumPodsToChart = 0;
    var ThisPod = p = 0;


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

/* When the user clicks on the button, 
toggle between hiding and showing the dropdown content */
function showMenu(nr) {
    document.getElementById("dropdown_menu" + nr).classList.toggle("show");
}

function setChart(nr, chart){
    console.log("TOGGLE TOGGLE:" + " " + nr + " " + chart)
    DoBattChart = false
    DoSpeedChart = false
    if (chart == "battery"){
        DoBattChart = true
    }
    if (chart == "speed"){
        DoSpeedChart = true
    }
    UpDateAll()
}

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {

    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

function toggleSettings() {
    const settings = $('#settings');
    settings.toggleClass('hidden');
    const chart = $('#charts');
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

function toggleCharts(chart_type) {
    const mapContainer= $('#map');
    mapContainer.toggleClass('chart-shown');
    const chart = $('#charts');
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
