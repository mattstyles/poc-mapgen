
'use strict';

var Voronoi = require( './voronoi' )
var fit = require( 'canvas-fit' )
var random = require( 'lodash.random' )
var C = require( './constants' )
var Region = require( './region' )

var canvas = document.createElement( 'canvas' )
document.body.appendChild( canvas )
window.addEventListener( 'resize', fit( canvas ), false )
var renderRegion = require( './render' )( canvas )

var heightmapCanvas = document.createElement( 'canvas' )
document.body.appendChild( heightmapCanvas )
heightmapCanvas.setAttribute( 'id', 'heightmap' )
fit( heightmapCanvas )
var renderHeightmap = require( './renderHeightmap' )( heightmapCanvas )




var region = new Region({
  x: 0,
  y: 0,
  width: C.WORLD_SIZE[ 0 ],
  height: C.WORLD_SIZE[ 1 ],
  divisions: C.DIVISIONS
})

var region2 = new Region({
  x: C.WORLD_SIZE[ 0 ],
  y: 0,
  width: C.WORLD_SIZE[ 0 ],
  height: C.WORLD_SIZE[ 1 ],
  divisions: C.DIVISIONS
})




var start = performance.now()
console.log( 'generating voronoi' )
region.diagram = region.voronoi()

// region.diagram.vertices.forEach( vertex => {
//   // console.log( vertex.x, region2.origin[ 0 ] )
//   if ( vertex.x === region2.origin[ 0 ] ) {
//     // console.log( 'pushing' )
//     region2.sites.push({
//       x: vertex.x,
//       y: vertex.y
//     })
//   }
// })

region2.diagram = region2.voronoi()
console.log( 'done', performance.now() - start )

function render() {
  renderRegion( region )
  renderRegion( region2 )
}

render()

window.region = region
window.region2 = region2
window.renderHeightmap = renderHeightmap //eg renderHeightmap({x:0,y:0,width:800,height:400})
