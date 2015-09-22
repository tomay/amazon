// index.js
var MAP; var HIGHLIGHT; var LAYERS = {};
var BOUNDS = [[-20.1, -79.8],[5.2, -43]]; 
var HIGHLIGHT_STYLE = {fillOpacity: 0, opacity: 0.9};

// functions called on doc ready
$(document).ready(function(){
	initMapControls();
	initMap();
	initLayerPanel();
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

	zIndex = 10;

	// add streets
	var OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		zIndex: zIndex++
	}).addTo(MAP);

	// add forest
	var forest = L.tileLayer('https://s3-us-west-1.amazonaws.com/amazonbasin/fortiles/{z}/{x}/{y}.png', {
		tms: true,
		maxZoom: 10,
		// errorTileUrl: './images/blank256.png'
		bounds: [[-30, -80],[9, -44]],
		zIndex: zIndex++
	}).addTo(MAP);
	LAYERS['forest'] = forest;

	// add Goulding basins
    cartodb.createLayer(MAP, 'https://rebioma.cartodb.com/api/v2/viz/23f7fb56-60b4-11e5-9325-0e73ffd62169/viz.json')
        .addTo(MAP)
    .on('done', function(layer) {

    layer.setInteraction(true);
	layer.setZIndex(zIndex++);
	LAYERS['goulding'] = layer;

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
	layer.setZIndex(zIndex++);
	LAYERS['rivers'] = layer;

    layer.on('error', function(err) {
            cartodb.log.log('error: ' + err);
        });
    }).on('error', function() {
    	cartodb.log.log("some error occurred");
    });    

    // protected areas and indigenous reserves 
    // https://rebioma.cartodb.com/api/v2/viz/6841a8ae-60a3-11e5-af5e-0e73ffd62169/viz.json
    cartodb.createLayer(MAP, 'https://rebioma.cartodb.com/api/v2/viz/6841a8ae-60a3-11e5-af5e-0e73ffd62169/viz.json')
        .addTo(MAP)
    .on('done', function(layer) {

	layer.setInteraction(false);
	layer.setZIndex(zIndex++);
	LAYERS['pas'] = layer;

    layer.on('error', function(err) {
            cartodb.log.log('error: ' + err);
        });
    }).on('error', function() {
    	cartodb.log.log("some error occurred");
    });    

	// add Amazon basin outline last
    cartodb.createLayer(MAP, 'https://rebioma.cartodb.com/api/v2/viz/e8702c42-5e48-11e5-8515-0e4fddd5de28/viz.json')
        .addTo(MAP)
    .on('done', function(layer) {

    layer.setInteraction(false);
	layer.setZIndex(zIndex++);

    layer.on('error', function(err) {
        	cartodb.log.log('error: ' + err);
    	});
    }).on('error', function() {
     	cartodb.log.log("some error occurred");
    });

    // instantiate highlights as empty layer group
    HIGHLIGHT = L.layerGroup([]).addTo(MAP);

    // stop propogation on a couple of map panel divs
    stopPropogationOnDiv('layer-panel');
    stopPropogationOnDiv('select-panel');

}


function initBasinSelect() {
	// initialize select2
	$('#goulding-select').select2({placeholder: "Select a basin", minimumResultsForSearch: Infinity});

	$('#goulding-select').on('change', function() {
		var val = $('#goulding-select option:selected').attr('name');
		var query = "SELECT * FROM goulding WHERE goulding = '" + val + "'"; 
		var sql = new cartodb.SQL({ user: 'rebioma' });

		// zoom to selection
		sql.getBounds(query).done(function(bounds) {
			MAP.fitBounds(bounds);
		});

		// update the results-pane
		query_no_geom = "SELECT area_km2, status, trajectory, defor01_12 FROM goulding WHERE goulding = '" + val + "'"; 
		sql.execute(query_no_geom).done(function(results){
			var area       = results.rows[0]['area_km2'];
			area = Math.round(area).toLocaleString() + ' km<sup>2</sup>';
			var defor      = results.rows[0]['defor01_12'];
			defor = Math.round(defor).toLocaleString() + ' km<sup>2</sup>';
			var trajectory = results.rows[0]['trajectory'];
			var status     = results.rows[0]['status'];
			
			// fill in the blanks
			$('div#results-pane table td[data-cell="area"]').html(area);
			$('div#results-pane table td[data-cell="defor"]').html(defor);
			$('div#results-pane table td[data-cell="trajectory"]').text(trajectory);
			$('div#results-pane table td[data-cell="status"]').text(status);

			// show it
			$('div#results-pane').show();
			
		});

		// highlight the selection
		var sqljson = new cartodb.SQL({ user: 'rebioma', format: 'geojson' });
		sqljson.execute(query).done(function(geojson){
			if (HIGHLIGHT.getLayers().length > 0) HIGHLIGHT.clearLayers();
			L.geoJson(geojson,{style: HIGHLIGHT_STYLE}).addTo(HIGHLIGHT);			
		});

	})

}

function initLayerPanel() {
	$('#layer-panel input').on('change', function() {
		var check = $(this);
		var layer = check.data('layer');
		if ( (check).is(':checked') ) {
			MAP.addLayer(LAYERS[layer])
		} else {
			MAP.removeLayer(LAYERS[layer])
		}
	});
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

function stopPropogationOnDiv(div_id) {
	var div = L.DomUtil.get(div_id);
	if (!L.Browser.touch) {
	    L.DomEvent.disableClickPropagation(div);
	    L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);
	} else {
	    L.DomEvent.disableClickPropagation(div);
	    L.DomEvent.on(div, 'click', L.DomEvent.stopPropagation);
	    L.DomEvent.on(div, 'drag', L.DomEvent.stopPropagation);
	}
}