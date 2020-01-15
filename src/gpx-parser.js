/**
 * GPX file parser
 * 
 * @constructor
 */
var gpxParser = function () {
    this.xmlSource = "";
    this.metadata  = {};
    this.waypoints = [];
    this.tracks    = [];
    this.routes    = [];
};

/**
 * Parse a gpx formatted string to a GPXParser Object
 * 
 * @param {string} gpxstring - A GPX formatted String
 * 
 * @return {gpxParser} A GPXParser object
 */
gpxParser.prototype.parse = function (gpxstring) {
    var keepThis = this;
    var domParser = new window.DOMParser();
    this.xmlSource = domParser.parseFromString(gpxstring, 'text/xml');

    metadata = this.xmlSource.querySelector('metadata');
    if(metadata != null){
        this.metadata.name  = this.getElementValue(metadata, "name");
        this.metadata.desc  = this.getElementValue(metadata, "desc");
        this.metadata.time  = this.getElementValue(metadata, "time");

        let author = {};
        let authorElem = metadata.querySelector('author');
        if(authorElem != null){
            author.name = this.getElementValue(authorElem, "name");
            author.email  = {};
            let emailElem = authorElem.querySelector('email');
            if(emailElem != null){
                author.email.id     = emailElem.getAttribute("id");
                author.email.domain = emailElem.getAttribute("domain");
            }

            let link     = {};
            let linkElem = authorElem.querySelector('link');
            if(linkElem != null){
                link.href = linkElem.getAttribute('href');
                link.text = this.getElementValue(linkElem, "text");
                link.type = this.getElementValue(linkElem, "type");
            }
            author.link = link;
        }
        this.metadata.author = author;

        let link = {};
        let linkElem = this.queryDirectSelector(metadata, 'link');
        if(linkElem != null){
            link.href = linkElem.getAttribute('href');
            link.text = this.getElementValue(linkElem, "text");
            link.type = this.getElementValue(linkElem, "type");
            this.metadata.link = link;
        }
    }

    var wpts = [].slice.call(this.xmlSource.querySelectorAll('wpt'));
    for (let idx in wpts){
        var wpt = wpts[idx];
        let pt  = {};
        pt.name = keepThis.getElementValue(wpt, "name")
        pt.lat  = parseFloat(wpt.getAttribute("lat"));
        pt.lon  = parseFloat(wpt.getAttribute("lon"));
        pt.ele  = parseFloat(keepThis.getElementValue(wpt, "ele")) || null;
        pt.cmt  = keepThis.getElementValue(wpt, "cmt");
        pt.desc = keepThis.getElementValue(wpt, "desc");
        keepThis.waypoints.push(pt);
    }

    var rtes = [].slice.call(this.xmlSource.querySelectorAll('rte'));
    for (let idx in rtes){
        var rte = rtes[idx];
        let route = {};
        route.name   = keepThis.getElementValue(rte, "name");
        route.cmt    = keepThis.getElementValue(rte, "cmt");
        route.desc   = keepThis.getElementValue(rte, "desc");
        route.src    = keepThis.getElementValue(rte, "src");
        route.number = keepThis.getElementValue(rte, "number");
        route.type   = keepThis.queryDirectSelector(rte, "type").innerHTML;

        let link     = {};
        let linkElem = rte.querySelector('link');
        if(linkElem != null){
            link.href = linkElem.getAttribute('href');
            link.text = keepThis.getElementValue(linkElem, "text");
            link.type = keepThis.getElementValue(linkElem, "type");
        }
        route.link = link;

        let routepoints = [];
        var rtepts = [].slice.call(rte.querySelectorAll('rtept'));

        for (let idxIn in rtepts){
            var rtept = rtepts[idxIn];
            let pt    = {};
            pt.lat    = parseFloat(rtept.getAttribute("lat"));
            pt.lon    = parseFloat(rtept.getAttribute("lon"));
            pt.ele    = parseFloat(keepThis.getElementValue(rtept, "ele"));
            routepoints.push(pt);
        }

        route.distance = keepThis.calculDistance(routepoints);
        route.elevation = keepThis.calcElevation(routepoints);
        route.points = routepoints;
        keepThis.routes.push(route);
    }

    var trks = [].slice.call(this.xmlSource.querySelectorAll('trk'));
    for (let idx in trks){
        var trk = trks[idx];
        let track = {};

        track.name   = keepThis.getElementValue(trk, "name");
        track.cmt    = keepThis.getElementValue(trk, "cmt");
        track.desc   = keepThis.getElementValue(trk, "desc");
        track.src    = keepThis.getElementValue(trk, "src");
        track.number = keepThis.getElementValue(trk, "number");
        track.type   = keepThis.queryDirectSelector(trk, "type").innerHTML;

        let link     = {};
        let linkElem = trk.querySelector('link');
        if(linkElem != null){
            link.href = linkElem.getAttribute('href');
            link.text = keepThis.getElementValue(linkElem, "text");
            link.type = keepThis.getElementValue(linkElem, "type");
        }
        track.link = link;

        let trackpoints = [];
        var trkpts = [].slice.call(trk.querySelectorAll('trkpt'));
	    for (let idxIn in trkpts){
            var trkpt = trkpts[idxIn];
            let pt = {};
            pt.lat = parseFloat(trkpt.getAttribute("lat"));
            pt.lon = parseFloat(trkpt.getAttribute("lon"));
            pt.ele = parseFloat(keepThis.getElementValue(trkpt, "ele")) || null;
            trackpoints.push(pt);
        }
        track.distance = keepThis.calculDistance(trackpoints);
        track.elevation = keepThis.calcElevation(trackpoints);
        track.points = trackpoints;
        keepThis.tracks.push(track);
    }
};

/**
 * Get value from a XML DOM element
 * 
 * @param  {Element} parent - Parent DOM Element
 * @param  {string} needle - Name of the searched element
 * 
 * @return {} The element value
 */
gpxParser.prototype.getElementValue = function(parent, needle){
    let elem = parent.querySelector(needle);
    if(elem != null){
            return elem.innerHTML;
    }
    return elem;
}

gpxParser.prototype.queryDirectSelector = function(parent, needle) {

    let elements  = parent.querySelectorAll(needle);
    let finalElem = elements[0];

    if(elements.length > 1) {
        let directChilds = parent.childNodes;

        directChilds.forEach(function(elem){
            if(elem.tagName === needle) {
                finalElem = elem;
            }
        });
    }

    return finalElem;
}

/**
 * Calcul the Distance Object from an array of points
 * 
 * @param  {} points - An array of points with lat and lon properties
 * 
 * @return {DistanceObject} An object with total distance and Cumulative distances
 */
gpxParser.prototype.calculDistance = function(points) {
    let distance = {};
    let totalDistance = 0;
    let cumulDistance = [];
    for (var i = 0; i < points.length - 1; i++) {
        totalDistance += this.calcDistanceBetween(points[i],points[i+1]);
        cumulDistance[i] = totalDistance;
    }
    cumulDistance[points.length - 1] = totalDistance;

    distance.total = totalDistance;
    distance.cumul = cumulDistance;

    return distance;
}
/**
 * Calcul Distance between two points with lat and lon
 * 
 * @param  {} wpt1 - A geographic point with lat and lon properties
 * @param  {} wpt2 - A geographic point with lat and lon properties
 * 
 * @returns {float} The distance between the two points
 */
gpxParser.prototype.calcDistanceBetween = function (wpt1, wpt2) {
    let latlng1 = {};
    latlng1.lat = wpt1.lat;
    latlng1.lon = wpt1.lon;
    let latlng2 = {};
    latlng2.lat = wpt2.lat;
    latlng2.lon = wpt2.lon;
    var rad = Math.PI / 180,
		    lat1 = latlng1.lat * rad,
		    lat2 = latlng2.lat * rad,
		    sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2),
		    sinDLon = Math.sin((latlng2.lon - latlng1.lon) * rad / 2),
		    a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
		    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return 6371000 * c;
}

/**
 * Generate Elevation Object from an array of points
 * 
 * @param  {} points - An array of points with ele property
 * 
 * @returns {ElevationObject} An object with negative and positive height difference and average, max and min altitude data
 */
gpxParser.prototype.calcElevation = function (points) {
    var dp = 0,
        dm = 0,
        ret = {};

    for (var i = 0; i < points.length - 1; i++) {
        var diff = parseFloat(points[i + 1].ele) - parseFloat(points[i].ele);

        if (diff < 0) {
            dm += diff;
        } else if (diff > 0) {
            dp += diff;
        }
    }

    var elevation = [];
    var sum = 0;

    for (var i = 0, len = points.length; i < len; i++) {
        var ele = parseFloat(points[i].ele);
        elevation.push(ele);
        sum += ele;
    }

    ret.max = Math.max.apply(null, elevation) || null;
    ret.min = Math.min.apply(null, elevation) || null;
    ret.pos = Math.abs(dp) || null;
    ret.neg = Math.abs(dm) || null;
    ret.avg = sum / elevation.length || null;

    return ret;
};
/**
 * Check if an object is empty
 * 
 * @param  {} obj - An object
 * 
 * @returns {bool} True or False
 */
gpxParser.prototype.isEmpty = function (obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }
    return true;
};

/**
 * Export the GPX object to a GeoJSON formatted Object
 * 
 * @returns {} a GeoJSON formatted Object
 */
gpxParser.prototype.toGeoJSON = function () {
    var GeoJSON = {
        "type": "FeatureCollection",
        "features": [],
        "properties": {
            "name": this.metadata.name,
            "desc": this.metadata.desc,
            "time": this.metadata.time,
            "author": this.metadata.author,
            "link": this.metadata.link,
        },
    };

    this.tracks.forEach(function(track){
        var feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": []
            },
            "properties": {
            }
        };

        feature.properties.name   = track.name;
        feature.properties.cmt    = track.cmt;
        feature.properties.desc   = track.desc;
        feature.properties.src    = track.src;
        feature.properties.number = track.number;
        feature.properties.link   = track.link;
        feature.properties.type   = track.type;

        track.points.forEach(function(pt){
            var geoPt = [];
            geoPt.push(pt.lon);
            geoPt.push(pt.lat);
            geoPt.push(pt.ele);

            feature.geometry.coordinates.push(geoPt);
        });

        GeoJSON.features.push(feature);
    });

    this.routes.forEach(function(track){
        var feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": []
            },
            "properties": {
            }
        };

        feature.properties.name   = track.name;
        feature.properties.cmt    = track.cmt;
        feature.properties.desc   = track.desc;
        feature.properties.src    = track.src;
        feature.properties.number = track.number;
        feature.properties.link   = track.link;
        feature.properties.type   = track.type;

        track.points.forEach(function(pt){
            var geoPt = [];
            geoPt.push(pt.lon);
            geoPt.push(pt.lat);
            geoPt.push(pt.ele);

            feature.geometry.coordinates.push(geoPt);
        });

        GeoJSON.features.push(feature);
    });

    this.waypoints.forEach(function(pt){
        var feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": []
            },
            "properties": {
            }
        };

        feature.properties.name = pt.name;
        feature.properties.cmt  = pt.cmt;
        feature.properties.desc = pt.desc;

        feature.geometry.coordinates = [pt.lon, pt.lat, pt.ele];

        GeoJSON.features.push(feature);
    });

    return GeoJSON;
}

module.exports = gpxParser;