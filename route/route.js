// Load the Visualization API and the columnchart package.
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

let poly;
let map;
let elevator;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 7,
    center: {lat: 52.12, lng: 21.00},
  });

  poly = new google.maps.Polyline({
    strokeColor: '#000000',
    strokeOpacity: 1.0,
    strokeWeight: 3,
  });
  poly.setEditable(true);
  poly.setMap(map);

  // Add a listener for the click event to add new vertexes
  map.addListener('click', addLatLng);
  // Add listener to update route after dragging vertex
  poly.addListener('mouseup', alterRoute);
  // Add listener to delete vertexes on click
  poly.addListener('click', function(event){
    if(event.vertex != null){
      var path = this.getPath();
      path.removeAt(event.vertex);
    }
  });

  var xhr = new XMLHttpRequest();
  var url = "https://euroloop-route.herokuapp.com/init";
  xhr.open("POST", url, true);
  xhr.onreadystatechange = function() {//Call a function when the response is received.
      if(xhr.readyState == 4 && xhr.status == 200) {
          console.log(xhr.responseText);
          var jsonResponse = JSON.parse(xhr.responseText);
          document.getElementById('podweight').value = jsonResponse.podweight
      }
  }
  xhr.send()

  // Create an ElevationService.
  elevator = new google.maps.ElevationService;

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
}

function alterRoute(){
  // Needs small delay to let polyline be updated
  setTimeout(updateRoute, 5)
}

// Handles click events on a map, adds a new point to the Polyline and updates elevation graph.
function addLatLng(event) {
  var path = poly.getPath();
  // Because path is an MVCArray, we can simply append a new coordinate
  // and it will automatically appear.
  path.push(event.latLng);

  updateRoute();
}

// Call backend service and update values
function updateRoute(event){

  displayPathElevation(poly.getPath().getArray(), elevator, map);

  var length = poly.inM()
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
