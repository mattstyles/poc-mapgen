
'use strict';

var fit = require( 'canvas-fit' )
var raf = require( 'raf-stream' )
var Simplex = require( 'fast-simplex-noise' )
var Noise = require( 'noisejs' ).Noise
var Bezier = require( 'bezier-easing' )
var ndarray = require( 'ndarray' )
// var PRNG = require( 'seedrandom' )  // @TODO massively adds to bundle size, use another
var Alea = require( 'alea' )
// var dist = require( 'mathutil' ).euclidean
var clamp = require( 'mathutil' ).clamp
var biomes = require( './biomes' )

var DIMS = [ 512, 512 ]

Object.assign( document.body.style, {
  background: 'black'
})

var biomeText = document.createElement( 'div' )
biomeText.classList.add( 'js-biomeText' )
document.body.appendChild( biomeText )
Object.assign( biomeText.style, {
  position: 'absolute',
  top: '2px',
  right: '2px',
  zIndex: '1000',
  background: 'rgba(0,0,0,.9)',
  color: 'white',
  fontFamily: 'Coolville, "Helvetica Neue", sans-serif',
  fontSize: '20px',
  padding: '3px 12px',
  borderRadius: '3px'
})

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

var seed = Math.random()
// var seed = 0.4047927854117006
var freq = 1200

console.log( 'seed', seed )
localStorage.setItem( 'seed', seed )

// Remember to add octaves, otherwise it defaults to 1 which is smooth
window.noise = new Simplex({
  min: -1,
  max: 1,
  octaves: 8,
  persistence: .55,
  frequency: 1 / freq,
  random: new Alea( seed )
})
window.noise2 = new Simplex({
  min: -1,
  max: 1,
  octaves: 8,
  persistence: .65,
  frequency: 1 / freq,
  random: new Alea( seed + 1 )
})
const JITTER_AMOUNT = .1   // This should probably be increased as freq goes up
window.jitter = new Simplex({
  min: -1,
  max: 1,
  octaves: 4,
  frequency: 1 / freq * .15,
  random: new Alea( seed + 2 )
})

// @TODO easing like this is slow
// var ease = new Bezier( 0, 0, .75, 1 )
// window.ease = new Bezier( .25, 0, .65, 1 )
var b = new Bezier( .6, .25, .8, 1 )

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
// var FREQ = 1 / 500
// var seed = 0.5112814791500568
// var seed = Math.random()

// console.log( 'seed', seed )
// localStorage.setItem( 'seed', seed )

var perlin = new Noise( seed )
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

var perlin2 = new Noise( seed > .8 ? seed - .05 : seed + .05 )
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

var WATER_LEVEL = .5
var count = 0

function generate() {
  var start = performance.now()
  for ( var y = 0; y < DIMS[ 1 ]; y++ ) {
    for ( var x = 0; x < DIMS[ 0 ]; x++ ) {
      elevation = noise.get2DNoise( x, y )
      roughness = noise2.get2DNoise( x, y )
      detail = jitter.get2DNoise( x, y ) * JITTER_AMOUNT
      // elevation = terrain( x * FREQ, y * FREQ )
      // roughness = terrain2( x * FREQ * .95, y * FREQ *.95 )
      // detail = terrain( x * FREQ * 120, y * FREQ * 120 ) * JITTER_AMOUNT

      height = ( elevation + ( roughness * detail ) )
      // height = elevation
      // height = roughness * detail


      height = clamp( .5 + .5 * height, 0, 1 )
      height = ease.get( height )


      /**
       * Generate temperature map
       * Use height to guide temp but add some noise
       * hot places will all be under sea but land temp so go 0...1, by changing
       * the scale the sea will effectively become very hot
       * @TODO should be influenced by some global scale too
       */
      temperature = b.get( ( height - .5 ) * 2 )
      temperature = 1.0 - temperature

      // cool down sea temp a little, although they will become ocean anyway
      if ( height < WATER_LEVEL ) {
        temperature = height
      }

      if ( temperature > .999 ) {
        count++
      }
      temperature = clamp( temperature, 0, .999 )


      /**
       * Generate moisture map, use diff seed and much larger frequency to
       * produce more variation
       */
      moisture = noise2.get2DNoise( x * .1, y * .1 )
      moisture = clamp( .5 + .5 * moisture, 0, .9999 )
      moisture = ease.get( moisture )

      /**
       * Tack on the biome
       */
      biome = biomes.get( moisture, temperature ).toUpperCase()
      if ( height < WATER_LEVEL ) {
        biome = 'OCEAN'
      }

      map.set( x, y, [ height, temperature, moisture, biome ] )
    }
  }
  console.log( 'generation done:', performance.now() - start )
  console.log( 'temp overs', count, (count / [ DIMS[ 0 ] * DIMS[ 1 ] ] * 100).toFixed( 1 ) + '%' )
}

function render() {
  renderMap( map )
}

function go() {
  generate()
  render()

  var low = Number.MAX_SAFE_INTEGER
  var high = Number.MIN_SAFE_INTEGER
  var low2 = Number.MAX_SAFE_INTEGER
  var high2 = Number.MIN_SAFE_INTEGER
  var e, t
  map.data.forEach( h => {
    // only count land tiles
    if ( h[ 0 ] < .5 ) {
      return
    }
    e = h[ 0 ] // elevation
    low = e < low ? e : low
    high = e > high ? e : high
    t = h[ 1 ] // temp
    low2 = t < low2 ? t : low2
    high2 = t > high2 ? t : high2
  })
  console.log( 'elevation:   ', 'low', low, 'high', high )
  console.log( 'temperature: ', 'low', low2, 'high', high2 )
}

// go()
generate()
render()
// raf( canvas )
//   .on( 'data', render )



window.render = render
window.Bezier = Bezier
window.Simplex = Simplex
// window.ease = ease
// window.noise = noise
window.map = map
window.go = go
