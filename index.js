
'use strict';

var Voronoi = require( './voronoi' )
var random = require( 'lodash.random' )
var C = require( './constants' )
var qs = require( 'qs' )

var canvas = document.createElement( 'canvas' )
var renderDiagram = require( './render' )( canvas )

var query = qs.parse( window.location.search.replace( /^\?/, '' ) )

var width = C.WORLD_SIZE[ 0 ]
var height = C.WORLD_SIZE[ 1 ]
var variance = C.PERTURB
var variance2 = variance / 2
var variance4 = variance / 4

var box = {
  xl: 0,
  xr: width,
  yt: 0,
  yb: height
}

var voronoi = new Voronoi()

var sites = []

function generatePerturbedMap() {
  let sites = []
  for ( let y = variance2; y <= height; y += variance ) {
    for ( let x = variance2; x <= width; x += variance ) {
      // perturb and push
      sites.push({
        x: x + random( -variance2, variance2 ),
        y: y + random( -variance2, variance2 )
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
