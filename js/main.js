(function(){
  "use strict";

  var map = L.map('map').setView([40.71, -73.93], 11),
      subwayLineGeoJson,
      subwayEntrancesGeoJson,
      neighborhoodGeoJson;

  var CartoDBTiles = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: 'Map Data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors, Map Tiles &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
  });

  var lines = [],
      stations = [];

  // add tiles to map.
  map.addLayer(CartoDBTiles);

  // Subway Line Data
  $.getJSON('data/MTA_subway_lines.geojson', function(data) {

    // console.log(data);

    var subwayLineData = data;

    var subwayLineStyle = {
      'color': '#5995ED',
      'weight': 2,
      'opacity': 0.8
    };

    var subwayLineClick = function(feature, layer) {
      lines.push(feature.properties.Line);
      // console.log(feature.properties.Line);
      layer.bindPopup(feature.properties.Line);
    };

    subwayLineGeoJson = L.geoJson(subwayLineData, {
      style: subwayLineStyle,
      onEachFeature: subwayLineClick
    }).addTo(map);

    console.log($.unique(lines));
    console.log($.unique(lines).length);

  });

  // Subway Entrances Data
  $.getJSON('data/Subway_entrances.geojson', function(data) {

    // console.log(data);

    var subwayEntrancesData = data;

    var subwayEntrancesPoint = function(feature, latlng) {
      // console.log(feature);

      var subwayEntranceMarker = L.circle(latlng, 6, {
        stroke: false,
        fillColor: '#FFAD05',
        fillOpacity: 1
      });

      return subwayEntranceMarker;
    };

    var subwayEntranceClick = function(feature, layer) {
      stations.push(feature.properties.line);
      //console.log(feature.properties);
      layer.bindPopup(feature.properties.name);
    };

    subwayEntrancesGeoJson = L.geoJson(subwayEntrancesData, {
      pointToLayer: subwayEntrancesPoint,
      onEachFeature: subwayEntranceClick
    }).addTo(map);

    console.log($.unique(stations));
    console.log($.unique(stations).length);

  });

  $.getJSON('data/NYC_neighborhood_data.geojson', function(data) {

    var neighborhoodData = data;

    var povertyStyle = function(feature) {

      var value = feature.properties.PovertyPer,
          fillColor = null;

        switch (true) {
          case (value >= 0 && value <= 0.1):
            fillColor = "#fee5d9";
            break;
          case (value > 0.1 && value <= 0.15):
            fillColor = "#fcbba1";
            break;
          case (value > 0.15 && value <= 0.2):
            fillColor = "#fc9272";
            break;
          case (value > 0.2 && value <= 0.3):
            fillColor = "#fb6a4a";
            break;
          case (value > 0.3 && value <= 0.4):
            fillColor = "#de2d26";
            break;
          case (value > 0.4):
            fillColor = "#a50f15";
            break;
        }

        var style = {
          weight: 1,
          opacity: 0.1,
          color: 'white',
          fillOpacity: 0.75,
          fillColor: fillColor
        };

        return style;
    };

    var povertyClick = function(feature, layer) {
      var percent = feature.properties.PovertyPer * 100;
      percent = percent.toFixed(0);

      layer.bindPopup("<strong>Neighborhood : </strong> " + feature.properties.NYC_NEIG + "<br /><strong>Percent in Poverty : </strong>" + percent + "%");
    };

    neighborhoodGeoJson = L.geoJson(neighborhoodData, {
      style: povertyStyle,
      onEachFeature: povertyClick
    });
    // .addTo(map);

    createLayerControl();

  });

  function createLayerControl() {
    var baseMaps = {
      'CartoDB': CartoDBTiles
    };

    var overlayMaps = {
      'Poverty Map': neighborhoodGeoJson,
      'Subway Line Map': subwayLineGeoJson,
      'Subway Entrances Map': subwayEntrancesGeoJson
    };

    L.control.layers(baseMaps, overlayMaps).addTo(map);
  }

})();
