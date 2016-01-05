
'use strict';

var Voronoi = require( './voronoi' )
var random = require( 'lodash.random' )
var C = require( './constants' )

var canvas = document.createElement( 'canvas' )
var renderDiagram = require( './render' )( canvas )


var box = {
  xl: 0,
  xr: canvas.width,
  yt: 0,
  yb: canvas.height
}

var voronoi = new Voronoi()

var sites = []

// generate square site map
for ( let y = 0; y <= canvas.height; y += canvas.height * .1 ) {
  for ( let x = 0; x <= canvas.width; x += canvas.width * .1 ) {
    // perturb and push
    sites.push({
      x: x + random( -canvas.width * .05, canvas.width * .05 ),
      y: y + random( -canvas.height * .05, canvas.height * .05 )
    })
  }
}


var start = performance.now()
console.log( 'generating voronoi' )
var diagram = voronoi.compute( sites, box )
console.log( 'done', performance.now() - start )

diagram._sites = sites

function render() {
  renderDiagram( diagram )
}

render()

window.Voronoi = Voronoi
window.box = box
window.voronoi = voronoi
window.sites = sites
window.diagram = diagram
