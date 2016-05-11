(function(){
  "use strict";

  // TODO: add search plugin
  // TODO: add spatial search
  //
  var initialZoom = (window.innerWidth < 700) ? 11 : 12;
  var map = L.map('map', {zoomControl: false, minZoom: initialZoom, }).setView([40.7114, -73.9716], initialZoom),
      subwayLineGeoJson,
      subwayEntrancesGeoJson,
      neighborhoodGeoJson;

  // http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png

  var CartoDBTiles = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: 'Map Data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors, Map Tiles &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
  });

  var geocoderOptions = {
    pointIcon: false,
    polygonIcon: false,
    expanded: true,
    fullWidth: false,
    panToPoint: false,
    autocomplete: false,
    bounds: L.latLngBounds([[40.9260, -74.2212], [40.4924, -73.6911]]),
    attribution: '',
    placeholder: 'Search by your address',
  };

  var legend = L.control({position: 'bottomright'});

  legend.onAdd = function (map) {

      var div = L.DomUtil.create('div', 'info legend'),
          grades = [0, 10, 20, 50, 100, 200, 500, 1000],
          labels = [];

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

      $.each(lineColor, function(key, value) {
        div.innerHTML +=
          '<p><i style="background:' + key + '"></i> <span>' + value.join(', ') + '</span></p>';
      });

      return div;
  };

  legend.addTo(map);

  /*
  var options = {
    bounds: true,
    position: 'topright',
    expanded: true
  }
  */

  var geocoder = L.control.geocoder('search-BCXXM8y', geocoderOptions).addTo(map);
  document.getElementById('geocoder').appendChild(geocoder.getContainer());
  geocoder.focus();



  L.control.zoom({ position: 'topright' }).addTo(map);
  // L.control.zoom({position: 'topright',});

  // add tiles to map.
  map.addLayer(CartoDBTiles);

  var query = "SELECT * FROM nyc_transit";

  var filters = [];

  $('.action > a').on('click', function(e) {
    e.preventDefault();
    var toggle = $(this).hasClass('toggle'),
        id = $(this).attr('id'),
        index = filters.indexOf(id);

    if (toggle) {
      $(this).removeClass('toggle');
    } else {
      $(this).addClass('toggle');
    }

    if (index >= 0) {
      filters.splice(index, 1);
    } else {
      filters.push(id);
    }

    var query = getQuery(filters);
    console.log(query);

    if (query !== "") {
      if (subwayEntrancesGeoJson) {
        map.removeLayer(subwayEntrancesGeoJson);
      }
      plotData2Map(query);
    } else {
      if (subwayEntrancesGeoJson) {
        map.removeLayer(subwayEntrancesGeoJson);
      }
    }



    //plotData2Map(query);

  });

  // plotData2Map(query);

  geocoder.on('select', function (e) {

    var coordinates = e.feature.geometry.coordinates;
    // Zoom in according to the search result
    map.setView([coordinates[1], coordinates[0]], 16);
    var latlng = coordinates[1] + "," + coordinates[0];


    var box = map.getBounds(),
        northEast = box._northEast,
        southWest = box._southWest;

    console.log(northEast);
    console.log(southWest);

    // Bounding box query
    var query = "SELECT * FROM nyc_transit WHERE ST_DWithin(the_geom_webmercator, ST_Transform(CDB_LatLng(" + latlng + "), 3857), 2000)";

    //var query = "SELECT * FROM nyc_transit WHERE the_geom && ST_SetSRID(ST_MakeBox2D(ST_Point(" + northEast.lng + ", " + northEast.lat + "), ST_Point(" + southWest.lng + ", " + southWest.lat + ")), 4326)";

    console.log(query);

    // Within query
    // var latlng = coordinates[1] + "," + coordinates[0];
    // var query = "SELECT * FROM table_29 WHERE ST_DWithin(the_geom_webmercator, ST_Transform(CDB_LatLng(" + latlng + "), 3857), 2000)";
    plotData2Map(query);
  });

  geocoder.on('reset', function(e) {
    map.removeLayer(subwayEntrancesGeoJson);
    map.setView([40.7114, -73.9716], initialZoom);
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
        // console.log(feature.properties.route1 + " : " + feature.properties.route2);
        var line = feature.properties.line,
            size = (feature.properties.entrance_type === 'Elevator') ? 15 : 6,

            subwayEntranceMarker = L.circleMarker(latlng, {
              stroke: true,
              fillColor: getEntrancesColor(feature.properties.route1),
              color: 'white',
              weight: 1,
              fillOpacity: 0.8,
              radius: 5,
            });

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
            fillColor: getEntrancesColor(e.target.feature.properties.route1),
            radius: 5,
          });
        }

        prev = target;

        target.setStyle({
          fillColor: 'black',
          radius: 10,
        });


        createContentDOM(e.target.feature);

      };

      var onEachFeature = function(feature, layer) {
        layer.on({
          mouseover: highlight,
          mouseout: reset,
          click: focus,
        })
      };

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
    var data = feature.properties,
        latlng;

    if (data.entrance_latitude && data.entrance_longitude) {
      latlng = data.entrance_latitude + ',' + data.entrance_longitude;
    }

    var entrance = {
      station_name: data.station_name,
      east_west_street: data.east_west_street,
      north_south_street: data.north_south_street,
      entry: data.entry,
      ada: data.ada,
      entrance_type: data.entrance_type,
      vending: data.vending,
      staffing: data.staffing,
      line: data.line,
      free_crossover: data.free_crossover,
      exit_only: data.exit_only,
      latlng: latlng,
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

  // Subway Line Data
  // TODO: proper line color.
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


  function getQuery(filters) {
    console.log(filters);
    console.log(filters.length);
    var sql = "";
    if (filters.length < 1) {
      return sql;
    } else {
      sql = "SELECT * FROM nyc_transit";
      for(var i = 0; i < filters.length; i++) {
        console.log(i);
        console.log(filters[i]);

        if (i === 0) {
          if (filters[i] === 'entrance') {
            sql = sql;
          } else if (filters[i] === 'staffing') {
            sql = sql + " WHERE staffing = 'FULL'";
          } else {
            sql = sql + " WHERE " + filters[i] + " = true";
          }
        } else {
          if (filters[i - 1] === 'entrance') {
            if (filters[i] === 'entrance') {
              sql = sql;
            } else if (filters[i] === 'staffing') {
              sql = sql + " WHERE staffing = 'FULL'";
            } else {
              sql = sql + " WHERE " + filters[i] + " = true";
            }
          } else {
            if (filters[i] === 'entrance') {
              sql = sql;
            } else if (filters[i] === 'staffing') {
              sql = sql + " AND staffing = 'FULL'";
            } else {
              sql = sql + " AND " + filters[i] + " = true";
            }
          }
        }
      }
    }
    return sql;
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

})();
