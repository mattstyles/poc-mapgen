
'use strict';

var Voronoi = require( './voronoi' )
var fit = require( 'canvas-fit' )
var random = require( 'lodash.random' )
var C = require( './constants' )
var Region = require( './region' )
var World = require( './world' )
var iterate = require( './iterate' )

var canvas = document.createElement( 'canvas' )
document.body.appendChild( canvas )
window.addEventListener( 'resize', fit( canvas, window, window.devicePixelRatio ), false )
var renderRegion = require( './render' )( canvas )

var heightmapCanvas = document.createElement( 'canvas' )
document.body.appendChild( heightmapCanvas )
heightmapCanvas.setAttribute( 'id', 'heightmap' )
fit( heightmapCanvas )
var renderHeightmap = require( './renderHeightmap' )( heightmapCanvas )


var world = new World()

function generate() {
  var start = performance.now()
  world.generate( 0, 0 )
  // world.generate( 1, 0 )
  // world.generate( 0, 1 )
  // world.generate( 1, 1 )
  console.log( 'generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color:rgb( 49, 162, 242 )' )
}


function render() {
  var start = performance.now()
  iterate( world.regions, renderRegion )
  console.log( 'render time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: rgb( 163, 206, 39 )' )
}

generate()
render()

window.world = world
window.renderHeightmap = renderHeightmap //eg renderHeightmap({x:0,y:0,width:400,height:400,noise:varying.random})
window.render = render
window.generate = generate
window.Noise = require( './noise' )
window.C = C
window.varying = require( './options' )
