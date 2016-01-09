
'use strict';

var Voronoi = require( './voronoi' )
var fit = require( 'canvas-fit' )
var random = require( 'lodash.random' )
var C = require( './constants' )
var Region = require( './region' )
var World = require( './world' )
var iterate = require( './iterate' )
var biomes = require( './biomes' )

var canvas = document.createElement( 'canvas' )
document.body.appendChild( canvas )
window.addEventListener( 'resize', fit( canvas, window, window.devicePixelRatio ), false )
var renderRegion = require( './render' )( canvas )

var heightmapCanvas = document.createElement( 'canvas' )
document.body.appendChild( heightmapCanvas )
heightmapCanvas.setAttribute( 'id', 'heightmap' )
heightmapCanvas.style.display = 'none'
fit( heightmapCanvas )
var renderHeightmap = require( './renderHeightmap' )( heightmapCanvas )

var biomeText = document.createElement( 'div' )
document.body.appendChild( biomeText )
Object.assign( biomeText.style, {
  position: 'absolute',
  top: '2px',
  right: '2px',
  fontFamily: 'Coolville',
  fontSize: '20px',
  color: 'rgb( 64, 64, 64)'
})

var world = new World()

function generate() {
  var start = performance.now()
  world.generate( 0, 0 )
  world.generate( 1, 0 )
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


canvas.addEventListener( 'click', event => {
  console.log( '' )
  // let cell = world.regions.get( 0, 0 ).getCell( event.x, event.y )
  let cell = world.getCell( event.x * window.devicePixelRatio, event.y * window.devicePixelRatio )
  console.log( cell )
  console.log( 'elevation', cell.elevation )
  console.log( 'temperature', cell.temperature )
  console.log( 'moisture', cell.moisture )
  console.log( 'biome %c' + cell.biome.toUpperCase(), 'color:rgb( 68, 137, 26 )' )
})

canvas.addEventListener( 'mousemove', event => {
  let cell = null
  let x = event.x * window.devicePixelRatio
  let y = event.y * window.devicePixelRatio
  try {
    cell = world.getCell( x, y )
  } catch ( err ) {
    biomeText.innerHTML = '[' + x + ', ' + y + ']'
  }

  if ( cell ) {
    let biome = biomes.get( cell.moisture, cell.temperature )
    biomeText.innerHTML = biome + '  [' + x + ', ' + y + ']'
  }
})

window.world = world
window.renderHeightmap = renderHeightmap //eg renderHeightmap({x:0,y:0,width:400,height:400,noise:varying.random})
window.render = render
window.generate = generate
window.Noise = require( './noise' )
window.C = C
window.varying = require( './options' )
window.biomes = require( './biomes' )
