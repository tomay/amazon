// index.js
var MAP; var HIGHLIGHT;
var BOUNDS = [[-20.1, -79.8],[5.2, -43]]; 
var HIGHLIGHT_STYLE = {fillOpacity: 0, opacity: 0.7};

// functions called on doc ready
$(document).ready(function(){
	initMapControls();
	initMap();
	initBasinSelect();

	resizeMap();

});

// global functions
$(window).resize(function(){
	resizeMap();
})

// init functions
function initMap() {
    MAP = L.map('map', {
    	maxZoom: 9,
     	minZoom: 5,
     	zoomControl: false
    }).fitBounds(BOUNDS);

	// add the zoom home control to the map
	var zoomHome = new L.Control.zoomHome();
	zoomHome.addTo(MAP);

	// add streets
	var OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(MAP);

	// add forest
	var forest = L.tileLayer('https://s3-us-west-1.amazonaws.com/amazonbasin/fortiles/{z}/{x}/{y}.png', {
		tms: true,
		maxZoom: 10,
		// errorTileUrl: './images/blank256.png'
		bounds: [[-30, -80],[9, -44]]
	}).addTo(MAP);

	// add basin boundary
    cartodb.createLayer(MAP, 'https://rebioma.cartodb.com/api/v2/viz/e8702c42-5e48-11e5-8515-0e4fddd5de28/viz.json')
        .addTo(MAP)
    .on('done', function(layer) {

    layer.setInteraction(false);

    layer.on('error', function(err) {
        	cartodb.log.log('error: ' + err);
    	});
    }).on('error', function() {
     	cartodb.log.log("some error occurred");
    });

	// add Goulding basins
    cartodb.createLayer(MAP, 'https://rebioma.cartodb.com/api/v2/viz/b344e3d6-5e49-11e5-a9bb-0e73ffd62169/viz.json')
        .addTo(MAP)
    .on('done', function(layer) {

    layer.setInteraction(true);

    layer.on('error', function(err) {
            cartodb.log.log('error: ' + err);
        });
    }).on('error', function() {
    	cartodb.log.log("some error occurred");
    });

    // add major rivers 
    cartodb.createLayer(MAP, 'https://rebioma.cartodb.com/api/v2/viz/dd699e72-5f25-11e5-b2c7-0e018d66dc29/viz.json')
        .addTo(MAP)
    .on('done', function(layer) {

    layer.setInteraction(false);

    layer.on('error', function(err) {
            cartodb.log.log('error: ' + err);
        });
    }).on('error', function() {
    	cartodb.log.log("some error occurred");
    });    

    // instantiate highlights as empty layer group
    HIGHLIGHT = L.layerGroup([]).addTo(MAP);

}


function initBasinSelect() {

	$('#goulding-select').on('change', function() {
		var val = $('#goulding-select option:selected').val();
		var query = "SELECT * FROM goulding WHERE goulding = '" + val + "'"; 
		var sql = new cartodb.SQL({ user: 'rebioma' });

		// zoom to selection
		sql.getBounds(query).done(function(bounds) {
			MAP.fitBounds(bounds);
		});

		// highlight the selection
		var sqljson = new cartodb.SQL({ user: 'rebioma', format: 'geojson' });
		sqljson.execute(query).done(function(geojson){
			if (HIGHLIGHT.getLayers().length > 0) HIGHLIGHT.clearLayers();
			L.geoJson(geojson,{style: HIGHLIGHT_STYLE}).addTo(HIGHLIGHT);			
		})

	})

}

function initMapControls() {
	// custom zoom bar control that includes a Zoom Home function
	L.Control.zoomHome = L.Control.extend({
	    options: {
	        position: 'topright',
	        zoomInText: '+',
	        zoomInTitle: 'Zoom in',
	        zoomOutText: '-',
	        zoomOutTitle: 'Zoom out',
	        zoomHomeText: '<i class="fa fa-home" style="line-height:1.65;"></i>',
	        zoomHomeTitle: 'Zoom home'
	    },

	    onAdd: function (map) {
	        var controlName = 'gin-control-zoom',
	            container = L.DomUtil.create('div', controlName + ' leaflet-bar'),
	            options = this.options;

	        this._zoomInButton = this._createButton(options.zoomInText, options.zoomInTitle,
	        controlName + '-in', container, this._zoomIn);
	        this._zoomHomeButton = this._createButton(options.zoomHomeText, options.zoomHomeTitle,
	        controlName + '-home', container, this._zoomHome);
	        this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
	        controlName + '-out', container, this._zoomOut);

	        this._updateDisabled();
	        map.on('zoomend zoomlevelschange', this._updateDisabled, this);

	        return container;
	    },

	    onRemove: function (map) {
	        map.off('zoomend zoomlevelschange', this._updateDisabled, this);
	    },

	    _zoomIn: function (e) {
	        this._map.zoomIn(e.shiftKey ? 3 : 1);
	    },

	    _zoomOut: function (e) {
	        this._map.zoomOut(e.shiftKey ? 3 : 1);
	    },

	    _zoomHome: function (e) {
	        // map.setView([lat, lng], zoom);
	        MAP.fitBounds(BOUNDS);
	    },

	    _createButton: function (html, title, className, container, fn) {
	        var link = L.DomUtil.create('a', className, container);
	        link.innerHTML = html;
	        link.href = '#';
	        link.title = title;

	        L.DomEvent.on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
	            .on(link, 'click', L.DomEvent.stop)
	            .on(link, 'click', fn, this)
	            .on(link, 'click', this._refocusOnMap, this);

	        return link;
	    },

	    _updateDisabled: function () {

	        var map = this._map,
	            className = 'leaflet-disabled';

	        L.DomUtil.removeClass(this._zoomInButton, className);
	        L.DomUtil.removeClass(this._zoomOutButton, className);

	        if (map._zoom === map.getMinZoom()) {
	            L.DomUtil.addClass(this._zoomOutButton, className);
	        }
	        if (map._zoom === map.getMaxZoom()) {
	            L.DomUtil.addClass(this._zoomInButton, className);
	        }
	    }
	});

}

// resize map to viewport
function resizeMap() {
	var height = $(window).height();

	$('#map').height(height);
	MAP.invalidateSize();

}