
'use strict';

var fit = require( 'canvas-fit' )
var Simplex = require( 'fast-simplex-noise' )
var Noise = require( 'noisejs' ).Noise
var Bezier = require( 'bezier-easing' )
var ndarray = require( 'ndarray' )
var PRNG = require( 'seedrandom' )  // @TODO massively adds to bundle size, use another
// var dist = require( 'mathutil' ).euclidean
var clamp = require( 'mathutil' ).clamp
var biomes = require( './biomes' )

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
var b = new Bezier( .25, 0, .65, 1 )

// 3x^2 - 2x^3
// much much quicker than calculating the bezier
window.ease = {
  get: function( v ) {
    // return v
    return v*v*(3 - 2 * v )
    // return v*v*v*(v*(v*6-15)+10)
    // return .5 * ( v * v * v ) + .5 * ( v * v )
    // return b.get( v )
  }
}

// this produces good looking landmasses and is quicker than the simplex version above,
// although that is probably just due to less octaves being calculated
var FREQ = 1 / 50
var perlin = new Noise( .25 )
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

var perlin2 = new Noise( .257 )
function terrain2( x, y ) {
  var h = perlin2.perlin2( x, y )
  x *= 2.94
  y *= 2.94
  h += perlin2.perlin2( x, y ) * .4
  x *= 2.87
  y *= 2.87
  h += perlin2.perlin2( x, y ) * .15
  x *= 2.63
  y *= 2.63
  h += perlin2.perlin2( x, y ) * .075
  // return Math.pow( h, 2 )
  return h
}


var map = ndarray( [ DIMS[ 0 ] * DIMS[ 1 ] ], [ DIMS[ 0 ], DIMS[ 1 ] ] )

var height = 0
var elevation = null
var roughness = null
var detail = null
var temperature = 0
var moisture = 0
var biome = null

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

      height = clamp( .5 + .5 * height, 0, 1 )
      height = ease.get( height )


      /**
       * Generate temperature map
       * Use height to guide temp but add some noise
       * hot places will all be under sea so raise up the temp map a little
       */
      temperature = height * ( .98 + detail )
      temperature = -.5 + 1.5 * temperature
      temperature = 1.0 - temperature

      if ( height < .5 ) {
        temperature = 0
      }


      /**
       * Generate moisture map, same freq as elevation but a diff seed
       */
      moisture = terrain2( x * FREQ, y * FREQ )
      moisture = clamp( .5 + .5 * moisture, 0, .9999 )

      /**
       * Tack on the biome
       */
      biome = biomes.get( moisture, temperature ).toUpperCase()
      if ( height < .5 ) {
        biome = 'OCEAN'
      }

      map.set( x, y, [ height, temperature, moisture, biome ] )
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
    // only count land tiles
    if ( h[ 0 ] < .5 ) {
      return
    }
    h = h[ 1 ]
    low = h < low ? h : low
    high = h > high ? h : high
  })
  console.log( 'low', low, 'high', high )
}

go()


// Add mousemove handler
const BLOCK_SIZE = 4
canvas.addEventListener( 'click', event => {
  console.log( map.get( event.x / BLOCK_SIZE | 0, event.y / BLOCK_SIZE | 0 ) )
})

window.render = render
window.Bezier = Bezier
window.Simplex = Simplex
// window.ease = ease
// window.noise = noise
window.map = map
window.go = go
