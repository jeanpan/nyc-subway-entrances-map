(function(){
  "use strict";

  // TODO: add search plugin
  // TODO: add spatial search
  //

  var map = L.map('map').setView([40.71, -73.93], 11),
      geocoder = L.control.geocoder('search-BCXXM8y').addTo(map),
      subwayLineGeoJson,
      subwayEntrancesGeoJson,
      neighborhoodGeoJson;

  var CartoDBTiles = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: 'Map Data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors, Map Tiles &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
  });

  // add tiles to map.
  map.addLayer(CartoDBTiles);

  var query = "SELECT * FROM nyc_transit";

  var param = $.param({
    q: query,
    format: "GeoJSON"
  });

  var url = "https://jeanpan.cartodb.com/api/v2/sql?" + param;

  console.log(url);

  geocoder.on('select', function (e) {

    var coordinates = e.feature.geometry.coordinates;
    // Zoom in according to the search result
    map.setView([coordinates[1], coordinates[0]], 17);

    var box = map.getBounds(),
        northEast = box._northEast,
        southWest = box._southWest;

    console.log(northEast);
    console.log(southWest);

    // Bounding box query
    var query = "SELECT * FROM nyc_transit WHERE the_geom && ST_SetSRID(ST_MakeBox2D(ST_Point(" + northEast.lng + ", " + northEast.lat + "), ST_Point(" + southWest.lng + ", " + southWest.lat + ")), 4326)";

    console.log(query);

    // Within query
    // var latlng = coordinates[1] + "," + coordinates[0];
    // var query = "SELECT * FROM table_29 WHERE ST_DWithin(the_geom_webmercator, ST_Transform(CDB_LatLng(" + latlng + "), 3857), 2000)";
    plotData2Map(query);
  });

  function plotData2Map(query) {

    var param = $.param({
      q: query,
      format: "GeoJSON"
    });

    var url = "https://jeanpan.cartodb.com/api/v2/sql?" + param;


    var promise = $.getJSON(url, function(data) {

      var prev;

      var subwayEntrancesData = data;

      var subwayEntrancesPoint = function(feature, latlng) {
        var line = feature.properties.line,
            size = (feature.properties.entrance_type === 'Elevator') ? 15 : 6,

            subwayEntranceMarker = L.circleMarker(latlng, {
              stroke: true,
              fillColor: 'blue',
              color: 'white',
              // fillColor: (feature.properties.entrance_type === 'Elevator') ? 'black' : 'red',
              fillOpacity: 0.8,
              radius: 8,
            });

        if (feature.properties.entrance_type === 'Elevator') {
          console.log(feature.properties.entrance_name);
          //subwayEntranceMarker.stroke = true;
          //subwayEntranceMarker.color = "black";
          subwayEntranceMarker.fillColor = "black";
        }

        return subwayEntranceMarker;
      };

      var highlight = function(e) {
        var target = e.target;

        target.setStyle({
          color: 'white',
          weight: 5,
        });
      };

      var reset = function(e) {

        var target = e.target;


        target.setStyle({
          color: 'white',
          weight: 0,
        });

      };

      var focus = function(e) {
        console.log(prev);

        var target = e.target;

        if (prev) {
          console.log('reset prev');
          prev.setStyle({
            fillColor: 'blue',
          });
        }

        prev = target;

        target.setStyle({
          fillColor: 'red',
        });


        createContentDOM(e.target.feature);

        // console.log(e);
      };

      var onEachFeature = function(feature, layer) {
        layer.on({
          mouseover: highlight,
          mouseout: reset,
          click: focus,
        })
      };

      /*
      var subwayEntranceClick = function(feature, layer) {
        //console.log(feature.properties);
        //layer.bindPopup('<strong>Line : </strong><span>' + feature.properties.line + '</span><br>' +
        //                '<strong>Entrances : </strong><span>' + feature.properties.name + '</span>');
      };
      */

      subwayEntrancesGeoJson = L.geoJson(subwayEntrancesData, {
        pointToLayer: subwayEntrancesPoint,
        onEachFeature: onEachFeature,
      }).addTo(map);

    });

  }

  function createContentDOM(feature) {
    $('.content').animate({
      //display: 'show',
      width: 'show',
    });
    var data = feature.properties;
    // console.log(data);

    var entrance = {
      station_name: data.station_name,
      east_west_street: data.east_west_street,
      north_south_street: data.north_south_street,
      entry: data.entry,
      ada: data.ada,
      entrance_type: data.entrance_type,
      vending: data.vending,
      staffing: data.staffing,
      route: [
        data.route1,
        data.route2,
        data.route3,
        data.route4,
        data.route5,
        data.route6,
        data.route7,
        data.route8,
        data.route9,
        data.route10,
      ],
    };
    // clean data
    $('.content').html('');

    var template = $('#template').html();
    var output = Mustache.render(template, entrance);

    $('.content').append(output);
  }
  /*
  // Subway Line Data
  $.getJSON('data/MTA_subway_lines.geojson', function(data) {

    var subwayLineData = data;

    var subwayLineStyle = function(feature) {
      var line = feature.properties.Line,
          style = {
            'color': getLineColor(line),
            'weight': 2,
            'opacity': 0.8
          };

      return style;
    };

    var subwayLineClick = function(feature, layer) {
      layer.bindPopup(feature.properties.Line);
    };

    subwayLineGeoJson = L.geoJson(subwayLineData, {
      style: subwayLineStyle,
      onEachFeature: subwayLineClick
    }).addTo(map);

  });
  */

  /*
  $.getJSON(url, function(data){
    var subwayEntrancesData = data;
    console.log(data);
  });
  */

  // Subway Entrances Data

  /*
  var promise = $.getJSON(url, function(data) {

    var subwayEntrancesData = data;

    var escalator = L.icon({
      iconUrl: '../image/Escalator-96.png',
      iconSize: [25, 25], // size of the icon
    });

    var subwayEntrancesPoint = function(feature, latlng) {
      var line = feature.properties.line,
          size = (feature.properties.entrance_type === 'Elevator') ? 15 : 6,
          // subwayEntranceMarker = L.marker(latlng, {icon: escalator});
          subwayEntranceMarker = L.circle(latlng, size, {
            stroke: false,
            fillColor: (feature.properties.entrance_type === 'Elevator') ? 'black' : 'red',
            fillOpacity: 1
          });


      if (feature.properties.entrance_type === 'Elevator') {
        console.log(feature.properties.entrance_name);
        //subwayEntranceMarker.stroke = true;
        //subwayEntranceMarker.color = "black";
        subwayEntranceMarker.fillColor = "black";
      }

      return subwayEntranceMarker;
    };

    var subwayEntranceClick = function(feature, layer) {
      //console.log(feature.properties);
      //layer.bindPopup('<strong>Line : </strong><span>' + feature.properties.line + '</span><br>' +
      //                '<strong>Entrances : </strong><span>' + feature.properties.name + '</span>');
    };

    subwayEntrancesGeoJson = L.geoJson(subwayEntrancesData, {
      pointToLayer: subwayEntrancesPoint,
      onEachFeature: subwayEntranceClick
    }).addTo(map);

  });

  promise.then(function(){
    console.log("done");
  });
  */

  // NYC Neighborhood Data
/*
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
      // 'Poverty Map': neighborhoodGeoJson,
      // 'Subway Line Map': subwayLineGeoJson,
      'Subway Entrances Map': subwayEntrancesGeoJson
    };

    L.control.layers(baseMaps, overlayMaps).addTo(map);
  }

  function getLineColor(line) {
    // http://web.mta.info/developers/resources/line_colors.htm
    var lineColor = {
      '#B933AD': ['7'],
      '#A7A9AC': ['L'],
      '#996633': ['J', 'Z'],
      '#00933C': ['4', '5', '6'],
      '#6CBE45': ['G'],
      '#EE352E': ['1', '2', '3'],
      '#FF6319': ['B', 'D', 'F', 'M'],
      '#808183': ['S'],
      '#0039A6': ['A', 'C', 'E'],
      '#FCCC0A': ['N', 'Q', 'R']
    };

    return matchColor(line, lineColor);
  }

  function getEntrancesColor(entrance) {
    // http://web.mta.info/developers/resources/line_colors.htm
    // Monochromatic Color
    var lineColor = {
      '#7d2275': ['7'],
      '#808387': ['L'],
      '#604020': ['J', 'Z'],
      '#00471d': ['4', '5', '6'],
      '#4c872f': ['G'],
      '#c01610': ['1', '2', '3'],
      '#cc4100': ['B', 'D', 'F', 'M'],
      '#5a5b5c': ['S'],
      '#001f5a': ['A', 'C', 'E'],
      '#b79302': ['N', 'Q', 'R']
    };

    return matchColor(entrance, lineColor);

  }

  function matchColor(str, colorObj) {
    var color = null,
        arr = str.split('-');

    $.each(colorObj, function(i, v) {
      if (v.indexOf(arr[0]) >= 0) {
        color = i;
      }
    });

    return color;
  }
  */

})();
