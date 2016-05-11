import 'babel-polyfill';
// Polyfills window.fetch
import 'whatwg-fetch';

import L from 'leaflet';
import $ from 'jquery';
import Mustache from 'mustache';
import 'leaflet-geocoder-mapzen';

const API_KEY = 'search-BCXXM8y';
const CARTODB_URL = 'https://jeanpan.cartodb.com/api/v2/sql';
const COLOR = {
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

var initialZoom = (window.innerWidth < 700) ? 11 : 12,
    subwayLineGeoJson,
    subwayEntrancesGeoJson;

/* Map */
var map = L.map('map', {
  zoomControl: false,
  minZoom: initialZoom,
}).setView([40.7114, -73.9716], initialZoom);

L.Icon.Default.imagePath = 'site/images';

/* Tile */
L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: 'Map Data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors, Map Tiles &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);

/* Zoom Control */
L.control.zoom({
  position: 'topright'
}).addTo(map);

/* Legned */
var legend = L.control({
  position: 'bottomright',
});
legend.onAdd = (map) => {
  var div = L.DomUtil.create('div', 'info legend');
  $.each(COLOR, (key, value) => {
    div.innerHTML +=
      '<p><i style="background:' + key + '"></i> <span>' + value.join(', ') + '</span></p>';
  });
  return div;
};
legend.addTo(map);

/* Geocoder */
var geocoderOption = {
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
var geocoder = L.control.geocoder(API_KEY, geocoderOption).addTo(map);
$('#geocoder').append(geocoder.getContainer());
geocoder.focus();

geocoder.on('select', (e) => {
  var coordinates = e.feature.geometry.coordinates,
      lat = coordinates[1],
      lng = coordinates[0],
      query = 'SELECT * FROM nyc_transit ' +
              'WHERE ST_DWithin(the_geom_webmercator, ST_Transform(CDB_LatLng(' + lat + "," + lng + '), 3857), 2000)';

  map.setView([lat, lng], 16);
  // debug
  // console.log(query);
  plotData2Map(query);
});

geocoder.on('reset', (e) => {
  map.removeLayer(subwayEntrancesGeoJson);
  map.setView([40.7114, -73.9716], initialZoom);
});

/* Handle Filter Buttons */
handleFilter();

/* Subway Line */
// TODO: proper line color
$.getJSON('data/MTA_subway_lines.geojson', (data) => {
  var subwayLineData = data;

  var subwayLineStyle = (feature) => {
    var line = feature.properties.Line,
        style = {
          'color': getColor(line),
          'weight': 2,
          'opacity': 0.8
        };
    return style;
  };

  var subwayLineClick = (feature, layer) => {
    layer.bindPopup(feature.properties.Line);
  };

  subwayLineGeoJson = L.geoJson(subwayLineData, {
    style: subwayLineStyle,
    onEachFeature: subwayLineClick
  }).addTo(map);

});

// TODO: bugs need to be fixed.
function plotData2Map(query) {
  var param = $.param({
    q: query,
    format: 'GeoJSON',
  });
  var url = CARTODB_URL + '?' + param;

  $.getJSON(url, (data) => {
    var prev;
    var subwayEntrancesData = data;

    var subwayEntrancesPoint = (feature, latlng) => {
      var properties = feature.properties,
          subwayEntranceMarker = L.circleMarker(latlng, {
            stroke: true,
            fillColor: getColor(properties.route1),
            color: 'white',
            weight: 1,
            fillOpacity: 0.8,
            radius: 5,
          });

      return subwayEntranceMarker;
    };

    var highlight = (e) => {
      var target = e.target;
      target.setStyle({
        color: 'white',
        weight: 5,
      });
    };

    var reset = (e) => {
      var target = e.target;
      target.setStyle({
        color: 'white',
        weight: 0,
      });
    };

    var focus = (e) => {
      var target = e.target;
      if (prev) {
        prev.setStyle({
          fillColor: getColor(e.target.feature.properties.route1),
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

    var onEachFeature = (feature, layer) => {
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

// TODO: should use geojson filter instead sent request again.
// TODO: bugs need to be fixed.
function getQuery(filters) {
  var sql = "";
  if (filters.length < 1) {
    return sql;
  } else {
    sql = "SELECT * FROM nyc_transit";
    for(var i = 0; i < filters.length; i++) {
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

function createContentDOM(feature) {
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
  $('.content').animate({
    width: 'show',
  });
  // clean data
  $('.content').html('');

  var template = $('#template').html();
  var output = Mustache.render(template, entrance);

  $('.content').append(output);
}

// TODO: need to be refactor.
function handleFilter() {
  var filters = [];

  $('.action > a').on('click', function(e) {
    e.preventDefault();

    var toggle = $(this).hasClass('toggle'),
        id = $(this).attr('id'),
        index = filters.indexOf(id);

    (toggle) ? $(this).removeClass('toggle') : $(this).addClass('toggle');

    (index >= 0) ? filters.splice(index, 1) : filters.push(id);

    var query = getQuery(filters);

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
  });
}

function getColor(str) {
  var color = null,
      arr = str.split('-');

  $.each(COLOR, (i, v) => {
    if (v.indexOf(arr[0]) >= 0) {
      color = i;
    }
  });
  return color;
}
