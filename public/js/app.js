$(document).ready(function() {
    window.mosaics = [];
    window.localMosaics = [];
    window.counter = 0;
    window.currId = 0;

    $.getJSON("/data/compiled.json", function(json) {
        processCSVs(json);
    }); 


    window.setTimeout(buildMasterTable,3000);
    window.setTimeout(plotInitial, 3000);



    });

function processCSVs(CSVs){
            for (i=0; i<CSVs.length; i++){
                var c = i;
                CSV = "/data/" + CSVs[i];

                var tail = CSV.substring(CSV.length - 4, CSV.length);
                if (tail !== ".CSV") {
                    console.log("Not a CSV");
                }
                else {

                    $.ajax({
                        type: "GET",
                        url: CSV,
                        dataType: "text",
                        success: function(data) {
                            parseMosaic(data);
                        }
                     });
                }
            }
        }

function plotInitial() {
    plotMosaic(1);
    // plotNN(1);
    plotDRP(1);
}

function parseMosaic(allText) {
    console.log("Calling parseMosaic on " + allText);    
    var isValid = true;
    console.log(Id);
    var localMosaics = [];
    var allTextLines = allText.split(/\r\n|\n/);
    curr_mosaic = {};
    var i = 0;
    var curr_line = allTextLines[i].split(',');
    while (curr_line[0] !== '"X"') { 
        // This is where we will check for errors in the CSVs
        var curr_line = allTextLines[i].split(',');
        curr_mosaic[curr_line[0]] = curr_line[1];

        i++;
    }

    curr_mosaic.X = [];
    curr_mosaic.Y = [];

    // Now we're on the X, Y coordinates
    while (i < allTextLines.length - 1) {
        var curr_line = allTextLines[i].split(',');
        var x = parseInt(curr_line[0]);
        var y = parseInt(curr_line[1]);
        curr_mosaic.X.push(x);
        curr_mosaic.Y.push(y);
        i++;
    }

    // Add to the global variable and the master table
    var refinedMosaic = refineMosaic(curr_mosaic);
    var Id = window.mosaics.length;  
    refinedMosaic.Id = Id;
    console.log(Id);
    window.mosaics.push(refinedMosaic);
    var row = "<tr id=\"" + Id + "\"><td>" + refinedMosaic.commonName + "</td><td>" + refinedMosaic.latinName + "</td></tr>";
    console.log("Adding row: " + row + " to the table");
    $(row).appendTo( "#master-table tbody" );
}

function refineMosaic(mosaic, Id) {
    var refinedMosaic = {};
    refinedMosaic.commonName = mosaic["\"SPECIES: common name\""].substring(1, mosaic["\"SPECIES: common name\""].length - 1);
    refinedMosaic.latinName = mosaic["\"SPECIES: Latin  name\""].substring(1, mosaic["\"SPECIES: Latin  name\""].length - 1);
    refinedMosaic.X = mosaic.X;
    refinedMosaic.Y = mosaic.Y;
    return(refinedMosaic);
}

function buildMasterTable() {
    
    $("tr").click(function() {
        var prevId = window.currId;        
        window.currId = $(this).attr("id");        
        plotMosaic(window.currId);
        plotDRP(window.currId);
 
        $(this).css("background-color", "rgba(0, 200, 100, 0.4)")
        console.log("Plotting mosaic number: " + window.mosaics[currId]);
        plotMosaic(currId);
        // plotNN(currId);
        plotDRP(currId);
        $(this).css("background-color", "rgba(0, 200, 100, 0.3)");
        $("tr#" + prevId).css("background-color",  "transparent");
    });

    $('#master-table').DataTable();

}

function plotMosaic(Id) {
    var X = window.mosaics[Id].X;
    var Y = window.mosaics[Id].Y;
    var TESTER = document.getElementById('mosaic-plot');
    var trace = {
        x: X,
        y: Y,
        textposition: 'top-center',
        mode: 'markers'
    };

    var layout = {
        xaxis: {range: [Math.min.apply(Math, X), Math.max.apply(Math, X)]},
        yaxis: {range: [Math.min.apply(Math, Y), Math.max.apply(Math, Y)]},
        title: window.mosaics[Id].commonName
    };
    
    Plotly.newPlot(TESTER, [ trace ], layout);
}

// function plotNN(Id) {

//     var nnDiv = document.getElementById("nn-plot");

//     var X = window.mosaics[Id].X;
//     var Y = window.mosaics[Id].Y;

//     var trace = {
//         x: X,
//         y: Y,
//         text: ['N', 'N', 'D'],
//         textposition: 'top-center',
//         mode: 'markers+text'
//     };

//     var layout = {
//         xaxis: {range: [Math.min.apply(Math, X), Math.max.apply(Math, X)]},
//         yaxis: {range: [Math.min.apply(Math, Y), Math.max.apply(Math, Y)]}
//     };

//     Plotly.newPlot(nnDiv, [ trace ], layout);
// }

function plotDRP(Id, radius) {
    var nnDiv = document.getElementById("drp-plot");

    var drp = calcHist(window.mosaics[Id]);
    var data = [
        {
            x: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
            y: drp,
            type: 'bar'
        }
    ];

    var layout = {
        title: "Density Recovery Profile"

    };

    Plotly.newPlot(nnDiv, data, layout);
}




    "use strict";
    var svgDocument = document.getElementById('svgDocument');
    var mainGroup;
    var boundRect = svgDocument.getElementById('boundRect');
    var scaler = svgDocument.getElementById('scaler');
    var translater = svgDocument.getElementById('translater');
    var minX, maxX, minY, maxY;
    var leftLine, rightLine, topLine, bottomLine;
    var proxCutoff = 200;
    var proxList, distList;
    var binWidth = 10;
    var hist, normHist;
    var dragLines;
    var boundVert, boundHorz;
    var mouseSvgPoint = svgDocument.createSVGPoint();
    var histSvg;
    var zoom = 1;
    var zoomFactor = 1.3;
    var zoomPoint;
    var boundDragPoint;

    function distance2(x1, y1, x2, y2) {
        var xd = x2 - x1;
        var yd = y2 - y1;
        return xd*xd + yd*yd;
    }

    function pointInBounds(i) {
        if (X[i] > Math.max.apply(null, X)) return false;
        if (X[i] < Math.min.apply(null, X)) return false;
        if (Y[i] > Math.max.apply(null, Y)) return false;
        if (Y[i] < Math.min.apply(null, Y)) return false;
        return true;
    }

    
function calcHist(mosaic)
    {
        var X = mosaic.X;
        var Y = mosaic.Y;
        var numPoints = X.length;
        var proxCutoff = 200;
        var binWidth = 10;

        var proxDist = makeProxList(X, Y, proxCutoff);
        var proxList = proxDist[0];
        var distList = proxDist[1];
        var numBins = Math.ceil(proxCutoff / binWidth);
        if (!numBins) numBins = 1;
        hist = new Array(numBins);
        for (var i=0; i<numBins; i++) {
            hist[i] = 0;
        }
        regionPoints = 0;
        for (var point=0; point<numPoints; point++) {
            window.X = mosaic.X;
            window.Y = mosaic.Y;
            if (!pointInBounds(point, mosaic.X, mosaic.Y)) continue;
            regionPoints++;
            var dlist = distList[point];
            var plist = proxList[point];
            for (var rel=0; rel<dlist.length; rel++) {
                if (!pointInBounds(plist[rel])) continue;
                var radius = dlist[rel];
                var bin = (radius / binWidth) | 0;
                if (bin < numBins) {
                    hist[bin]++;
                }
            }
        }

        var W = Math.max.apply(null, X) - Math.min.apply(null, X);
        var L = Math.max.apply(null, Y) - Math.min.apply(null, Y);

        regionArea = L * W;
        regionDensity = regionPoints / regionArea;
        maxRadius = Math.sqrt(Math.sqrt(4/3) / regionDensity);



        


        normHist = new Array(numBins);
        var hitMean = false;
        Ve = 0;
        for (var i=0; i<numBins; i++) {
            var area = Math.PI * binWidth*binWidth * (2*i+1);
            var r = (i+1) * binWidth;
            var compFactor = 1 - (2*r) / (Math.PI * L * W) * (L + W) + (r*r) / (Math.PI * L * W);
            //console.log('bin ', i, compFactor);
            normHist[i] = hist[i] / area / regionPoints / compFactor;
            //normHist[i] = hist[i] / ((i+1)*binWidth);
            // add to Ve until we reach the first bin that exceeds the mean density
            if (normHist[i] > regionDensity) hitMean = true;
            if (!hitMean) {
                var lambdai =  regionPoints * regionDensity * area;
                Ve += lambdai - hist[i];
            }
        }
        Ve /= regionPoints;
        effectiveRadius = Math.sqrt(Ve / (Math.PI * regionDensity));
        packingFactor = (effectiveRadius / maxRadius);
        packingFactor *= packingFactor;
        
        var Dc = 1 / Math.sqrt(regionArea * Math.PI * binWidth * binWidth);
        reliabilityFactor = regionDensity / Dc;
        return normHist;
    }
    
    
    function makeProxList(X, Y, proxCutoff)
    {
        var numPoints = X.length;
        proxList = new Array(numPoints);
        distList = new Array(numPoints);
        for (var i=0; i<numPoints; i++) {
            proxList[i] = new Array();
            distList[i] = new Array();
        }
        var proxCutoff2 = proxCutoff * proxCutoff;
        for (var a=0; a<numPoints; a++) {
            var xa = X[a];
            var ya = Y[a];
            for (var b=a+1; b<numPoints; b++) {
                var xb = X[b];
                var yb = Y[b];
                var dist2 = distance2(xa, ya, xb, yb);
                if (dist2 > proxCutoff2) continue;
                proxList[a].push(b);
                proxList[b].push(a);
                var dist = Math.sqrt(dist2);
                distList[a].push(dist);
                distList[b].push(dist);
            }
        }
        var proxListDistList = [proxList, distList];
        return proxListDistList
    }

function testhist(){
    return calcHist(window.mosaics[1]);
}
