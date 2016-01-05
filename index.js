
'use strict';

var Voronoi = require( './voronoi' )
var random = require( 'lodash.random' )
var C = require( './constants' )
var qs = require( 'qs' )

var canvas = document.createElement( 'canvas' )
var renderDiagram = require( './render' )( canvas )

var query = qs.parse( window.location.search.replace( /^\?/, '' ) )

var box = {
  xl: 0,
  xr: canvas.width,
  yt: 0,
  yb: canvas.height
}

var voronoi = new Voronoi()

var sites = []

function generatePerturbedMap() {
  let sites = []
  for ( let y = canvas.height * .05; y <= canvas.height; y += canvas.height * .1 ) {
    for ( let x = canvas.width * .05; x <= canvas.width; x += canvas.width * .1 ) {
      // perturb and push
      sites.push({
        // x: x + random( -canvas.width * .05, canvas.width * .05 ),
        // y: y + random( -canvas.height * .05, canvas.height * .05 )
        x: x,
        y: y
      })
    }
  }
  return sites
}

// generate square site map or use local save
if ( query.local === 'true' ) {
  try {
    sites = JSON.parse( localStorage.getItem( C.SITES_KEY ) )
  } catch ( err ) {
    sites = generatePerturbedMap()
  }
} else {
  sites = generatePerturbedMap()
}






var start = performance.now()
console.log( 'generating voronoi' )
var diagram = voronoi.compute( sites, box )
console.log( 'done', performance.now() - start )

function render() {
  renderDiagram( diagram )
}

render()

window.Voronoi = Voronoi
window.box = box
window.voronoi = voronoi
window.sites = sites
window.diagram = diagram
