
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

world.generate( 0, 0 )
world.generate( 1, 0 )
// world.generate( 0, 1 )
// world.generate( 1, 1 )


function render() {
  iterate( world.regions, renderRegion )
}

render()

window.world = world
window.renderHeightmap = renderHeightmap //eg renderHeightmap({x:0,y:0,width:800,height:400})
window.render = render
