
'use strict';

var fit = require( 'canvas-fit' )
var Simplex = require( 'fast-simplex-noise' )
var Noise = require( 'noisejs' ).Noise
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

var perlin = new Noise( .25 )

var freq = 7.7

// Remember to add octaves, otherwise it defaults to 1 which is smooth
window.noise = new Simplex({
  min: -1,
  max: 1,
  octaves: 8,
  persistence: .55,
  frequency: 1 / Math.pow( 2, freq ),
  random: new PRNG( require( './package.json' ).name )
})
window.noise2 = new Simplex({
  min: -1,
  max: 1,
  octaves: 8,
  persistence: .65,
  frequency: 1 / Math.pow( 2, freq ),
  random: new PRNG( require( './package.json' ).name + 'roughness'  )
})
const JITTER_AMOUNT = .1
window.jitter = new Simplex({
  min: -1,
  max: 1,
  octaves: 4,
  frequency: 1 / Math.pow( 2, freq * .15 ),
  random: new PRNG( require( './package.json' ).name + 'detail' )
})

// @TODO easing like this is slow
// var ease = new Bezier( 0, 0, .75, 1 )
// window.ease = new Bezier( .25, 0, .65, 1 )

// 3x^2 - 2x^3
// much much quicker than calculating the bezier
window.ease = {
  get: function( v ) {
    return v*v*(3 - 2 * v )
  }
}

// this produces good looking landmasses and is quicker than the simplex version above,
// although that is probably just due to less octaves being calculated
function terrain( x, y ) {
  var h = perlin.perlin2( x, y )
  x *= 2.94
  y *= 2.94
  h += perlin.perlin2( x, y ) * .4
  x *= 2.87
  y *= 2.87
  h += perlin.perlin2( x, y ) * .15
  x *= 2.63
  y *= 2.63
  h += perlin.perlin2( x, y ) * .075
  // return Math.pow( h, 2 )
  return h
}

var map = ndarray( [ DIMS[ 0 ] * DIMS[ 1 ] ], [ DIMS[ 0 ], DIMS[ 1 ] ] )

var FREQ = 1 / 80

var height = null
var elevation = null
var roughness = null
var detail = null
var center = [ DIMS[ 0 ] * .5, DIMS[ 1 ] * .5 ]
function generate() {
  var start = performance.now()
  for ( var y = 0; y < DIMS[ 1 ]; y++ ) {
    for ( var x = 0; x < DIMS[ 0 ]; x++ ) {
      // elevation = noise.get2DNoise( x, y )
      // roughness = noise2.get2DNoise( x, y )
      // detail = jitter.get2DNoise( x, y ) * JITTER_AMOUNT
      elevation = terrain( x * FREQ, y * FREQ )
      roughness = terrain( x * FREQ * .95, y * FREQ * .95 )
      detail = terrain( x * FREQ * 100, y * FREQ * 100 ) * JITTER_AMOUNT

      height = ( elevation + ( roughness * detail ) )
      // height = elevation
      // height = roughness * detail
      // height = ease.get( height )

      // height = perlin.perlin2( x * FREQ, y * FREQ )
      // height = terrain( x * FREQ, y * FREQ )

      height = .5 + .5 * height
      height = ease.get( height )

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

  var low = Number.MAX_SAFE_INTEGER
  var high = Number.MIN_SAFE_INTEGER
  map.data.forEach( h => {
    low = h < low ? h : low
    high = h > high ? h : high
  })
  console.log( 'low', low, 'high', high )
}

go()


window.render = render
window.Bezier = Bezier
window.Simplex = Simplex
// window.ease = ease
// window.noise = noise
window.map = map
window.go = go
