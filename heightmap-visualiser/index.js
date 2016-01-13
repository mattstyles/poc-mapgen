
'use strict';

var fit = require( 'canvas-fit' )
var ndarray = require( 'ndarray' )
var Simplex = require( 'fast-simplex-noise' )
// var quickNoise = require( 'quick-noise-js' )
var Noise = require( 'noisejs' ).Noise
// var PRNG = require( 'seedrandom' )  // seedrandom is big, smaller option?
var Alea = require( 'alea' )
var clamp = require( 'mathutil' ).clamp

var WIDTH = 512
var HEIGHT = 512

var canvas = document.createElement( 'canvas' )
window.addEventListener( 'resize', fit( canvas ), false )
document.body.appendChild( canvas )

var ctx = canvas.getContext( '2d' )

/**
 * noise functions
 */
// perlin2 is smoother than simplex2, but it does mean that octaves
// avergae it out further
// var seed = Math.random()
// var base = new Noise( seed )
// var noise = {
//   get: function( x, y ) {
//     var frequency = 1 / 10
//     var octaves = 6
//     var persistence = .5
//     var amplitude = 1
//     var maxAmplitude = 0
//     var n = 0
//     for ( var l = 0; l < octaves; l++ ) {
//       n += base.perlin2( x * frequency, y * frequency ) * amplitude
//       maxAmplitude += amplitude
//       amplitude *= persistence
//       frequency *= 2
//     }
//     return n / maxAmplitude
//   }
// }
// var noise = {
//   get: function terrain( x, y ) {
//     var frequency = 1 / 500
//     x = x * frequency
//     y = y * frequency
//     var h = base.perlin2( x, y )
//     x *= 2.94
//     y *= 2.94
//     h += base.perlin2( x, y ) * .4
//     x *= 2.87
//     y *= 2.87
//     h += base.perlin2( x, y ) * .15
//     x *= 2.63
//     y *= 2.63
//     h += base.perlin2( x, y ) * .075
//     // return Math.pow( h, 2 )
//     return .5 + .5 * h
//   }
// }

// only problem with octaved noise is the averaging that occurs
// so that -1...1 range ends up closer to -.75 to .75
// due to smoothing up the range a little to compensate, this does produce
// some small errors so clamp, this will result in local maxima/minima
// var seed = 0.3350439574569464
var seed = Math.random()
console.log( 'seed', seed )
var frequency = 220

var roughness = new Simplex({
  min: -1.4,
  max: 1.4,
  octaves: 6,
  amplitude: 1,
  frequency: 1 / frequency,
  persistence: .65,
  random: new Alea( seed )
})
var detail = new Simplex({
  min: -1,
  max: 1,
  octaves: 3,
  frequency: 1 / ( frequency * .125 ),
  random: new Alea( seed )
})
var height = new Simplex({
  min: -1.4,
  max: 1.4,
  octaves: 6,
  amplitude: 1,
  frequency: 1 / ( frequency * 1.6 ),
  persistence: .5,
  random: new Alea( seed + 1 )
})

var elevation = {
  get: function( x, y ) {
    var rough = .55 + .5 * roughness.get2DNoise( x, y )
    var elevation = height.get2DNoise( x, y )
    var det = detail.get2DNoise( x, y ) * .1 + 1
    var out = elevation * ( rough * det )
    return clamp( out, -1, 1 )
  }
}

// Doesnt work very well, creating a seeded table does not randomise
// and it is slower than noisejs (even noisejs.perlin3)
// var base = quickNoise.create( Math.random )
// var base = quickNoise.noise
// var noise = {
//   get: function( x, y ) {
//     return base( x * .05, y * .05, 1 )
//   }
// }

/**
 * ndarray image generation
 */
var nd = ndarray( new Float32Array( WIDTH * HEIGHT ), [ WIDTH, HEIGHT ] )
window.nd = nd

function generate() {
  var start = performance.now()
  for( var y = 0; y < HEIGHT; y++ ) {
    for( var x = 0; x < WIDTH; x++ ) {
      // nd.set( x, y, Math.random() )
      nd.set( x, y, elevation.get( x, y ) )
    }
  }
  console.log( 'heightmap generation time:', performance.now() - start )
}

/**
 * render stuff
 */
var image = ctx.createImageData( WIDTH, HEIGHT )
window.image = image
var data = image.data

function color( value ) {
  if ( value < .5 ) {
    value = 0
  }
  return [
    value * 255 | 0,
    value * 255 | 0,
    value * 255 | 0,
    255
  ]
}

function getColor( value ) {
  if ( value < 0 ) {
    return [ 48, 52, 109, 255 ]
  }
  if ( value >= 0 && value < .45 ) {
    return [ 52, 101, 36, 255 ]
  }
  if ( value >= .45 && value < .75 ) {
    return [ 109, 170, 44, 255 ]
  }
  return [ 222, 238, 214, 255 ]
}

function render() {
  var start = performance.now()
  var index = 0
  var tile = 0
  var col = []
  var max = Number.MIN_SAFE_INTEGER
  var min = Number.MAX_SAFE_INTEGER

  // this way is quicker as its just an array lookup, but, it the axes are different
  // for( var i = 0; i < nd.shape[ 0 ] * nd.shape[ 1 ]; i++ ) {
  //   tile = nd.data[ i ]
  //   index = i * 4
  //   col = color( .5 + .5 * tile )
  //   for ( var l = 0; l < col.length; l++ ) {
  //     data[ index + l ] = col[ l ]
  //   }
  //
  //   min = tile < min ? tile : min
  //   max = tile > max ? tile : max
  // }

  for ( var y = 0; y < nd.shape[ 1 ]; y++ ) {
    for ( var x = 0; x < nd.shape[ 0 ]; x++ ) {
      tile = nd.get( x, y )
      index = ( x + y * nd.shape[ 0 ] ) * 4
      // col = color( .5 + .5 * tile )
      col = getColor( tile )
      for ( var l = 0; l < col.length; l++ ) {
        data[ index + l ] = col[ l ]
      }

      min = tile < min ? tile : min
      max = tile > max ? tile : max
    }
  }

  ctx.putImageData( image, 0, 0 )
  console.log( 'render time:', performance.now() - start )
  console.log( 'min:', min, ' max:', max )
}


generate()
render()


var start = 0
var count = 0
var time = 0
// var timeout = setTimeout( function frame() {
//   start = performance.now()
//   // render()
//   generate()
//   time += performance.now() - start
//   count++
//   timeout = setTimeout( frame, 100 )
// }, 100 )

// var btn = document.createElement( 'button' )
// btn.innerHTML = 'Stop'
// Object.assign( btn.style, {
//   position: 'absolute',
//   top: '2px',
//   right: '2px',
//   padding: '3px 18px',
//   fontSize: '20px'
// })
// document.body.appendChild( btn )
// btn.addEventListener( 'click', event => {
//   clearTimeout( timeout )
//   var avg = time / count
//   console.log( 'average generation time', avg )
//   btn.innerHTML = avg.toFixed( 2 )
// })

var elevation = document.createElement( 'span' )
elevation.innerHTML = ''
Object.assign( elevation.style, {
  position: 'absolute',
  top: '2px',
  right: '2px',
  padding: '3px 18px',
  fontSize: '30px',
  fontFamily: 'Coolville',
  background: 'rgba( 0, 0, 0, .8 )',
  color: 'white'
})
document.body.appendChild( elevation )

canvas.addEventListener( 'mousemove', event => {
  elevation.innerHTML = nd.get( event.x, event.y ).toFixed( 2 )
})

/**
 * debug
 */
window.generate = generate
window.render = render
