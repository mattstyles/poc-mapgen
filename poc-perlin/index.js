
'use strict';

var fit = require( 'canvas-fit' )
var Simplex = require( 'fast-simplex-noise' )
var Bezier = require( 'bezier-easing' )
var ndarray = require( 'ndarray' )
var PRNG = require( 'seedrandom' )  // @TODO massively adds to bundle size, use another
// var dist = require( 'mathutil' ).euclidean
var clamp = require( 'mathutil' ).clamp

var DIMS = [ 256, 256 ]

var canvas = document.createElement( 'canvas' )
document.body.appendChild( canvas )
window.addEventListener( 'resize', fit( canvas, window, window.devicePixelRatio ), false )
var renderMap = require( './render' )( canvas )

function dist( p0, p1 ) {
  return Math.sqrt( Math.pow( p0[ 0 ] - p1[ 0 ], 2 ) + Math.pow( p0[ 1 ] - p1[ 1 ], 2 ) )
}

function gradient( origin, radius, target ) {
  return 1.0 - dist( origin, target ) / radius
}


const freq = 5.5

// var noise = new Simplex({
window.noise = new Simplex({
  min: 0,
  max: 1,
  frequency: 1 / Math.pow( 2, freq ),
  random: new PRNG( require( './package.json' ).name )
})
window.noise2 = new Simplex({
  min: 0,
  max: 1,
  frequency: 1 / Math.pow( 2, freq - 1 ),
  random: new PRNG( require( './package.json' ).name  )
})
const JITTER_AMOUNT = .05
window.jitter = new Simplex({
  min: -1,
  max: 1,
  frequency: 1 / Math.pow( 2, freq * .55 ),
  random: new PRNG( require( './package.json' ).name )
})

// @TODO easing like this is slow
// var ease = new Bezier( 0, 0, .75, 1 )
window.ease = new Bezier( .25, 0, .65, 1 )

var map = ndarray( [ DIMS[ 0 ] * DIMS[ 1 ] ], [ DIMS[ 0 ], DIMS[ 1 ] ] )

var height = null
var elevation = null
var roughness = null
var detail = null
var center = [ DIMS[ 0 ] * .5, DIMS[ 1 ] * .5 ]
function generate() {
  var start = performance.now()
  for ( var y = 0; y < DIMS[ 1 ]; y++ ) {
    for ( var x = 0; x < DIMS[ 0 ]; x++ ) {
      elevation = noise.get2DNoise( x, y )
      roughness = noise2.get2DNoise( x, y )
      detail = jitter.get2DNoise( x, y ) * JITTER_AMOUNT
      // height = noise.get2DNoise( x, y )
      // height *= noise2.get2DNoise( x, y ) * .5 + .5
      // height = ( noise.get2DNoise( x, y ) * .65 ) + ( noise2.get2DNoise( x, y ) * .35 )
      height = ( elevation + ( roughness * detail ) )
      height = ease.get( height )
      // height += gradient( center, 128, [ x, y ] ) * .65
      map.set( x, y, height )
    }
  }
  console.log( 'generation done:', performance.now() - start )
}

function render() {
  renderMap( map )
}

function go() {
  generate()
  render()
}

go()


window.render = render
window.Bezier = Bezier
window.Simplex = Simplex
// window.ease = ease
// window.noise = noise
window.map = map
window.go = go
