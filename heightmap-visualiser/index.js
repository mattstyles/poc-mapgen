
'use strict';

var fit = require( 'canvas-fit' )
var ndarray = require( 'ndarray' )
var Simplex = require( 'fast-simplex-noise' )
var Noise = require( 'noisejs' ).Noise
var PRNG = require( 'seedrandom' )  // seedrandom is big, smaller option?

var WIDTH = 512
var HEIGHT = 512

var canvas = document.createElement( 'canvas' )
window.addEventListener( 'resize', fit( canvas ), false )
document.body.appendChild( canvas )

var ctx = canvas.getContext( '2d' )

/**
 * noise functions
 */
// var seed = Math.random()
// var base = new Noise( seed )
// var noise = {
//   // This is not right at all!
//   get: function( x, y ) {
//     var frequency = 1 / 50
//     var octaves = 6
//     var persistence = .5
//     var i = x * frequency
//     var j = y * frequency
//     var v = base.perlin2( i, j )
//     var l
//     for ( l = 0; l < octaves; l++ ) {
//       i *= 2
//       j *= 2
//       v += base.perlin2( i, j ) * persistence
//       persistence *= .5
//     }
//     return v
//   }
// }

// only problem with octaved noise is the averaging that occurs
// so that -1...1 range ends up closer to -.7 to .7
var simplex = new Simplex({
  min: -1,
  max: 1,
  octaves: 6,
  amplitude: 1,
  frequency: 1 / 100,
  persistence: .5,
  // random: PRNG( require( './package.json' ).name )
  random: Math.random
})
var noise = {
  get: function( x, y ) {
    return simplex.get2DNoise( x, y )
  }
}

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
      nd.set( x, y, noise.get( x, y ) )
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

function render() {
  var start = performance.now()
  var index = 0
  var h = 0
  var max = Number.MIN_SAFE_INTEGER
  var min = Number.MAX_SAFE_INTEGER
  for( var i = 0; i < nd.shape[ 0 ] * nd.shape[ 1 ]; i++ ) {
    h = nd.data[ i ]
    index = i * 4
    data[ index ] = h * 255 | 0
    data[ index + 1 ] = h * 255 | 0
    data[ index + 2 ] = h * 255 | 0
    data[ index + 3 ] = 255

    min = h < min ? h : min
    max = h > max ? h : max
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

var btn = document.createElement( 'button' )
btn.innerHTML = 'Stop'
Object.assign( btn.style, {
  position: 'absolute',
  top: '2px',
  right: '2px',
  padding: '3px 18px',
  fontSize: '20px'
})
document.body.appendChild( btn )
btn.addEventListener( 'click', event => {
  clearTimeout( timeout )
  var avg = time / count
  console.log( 'average generation time', avg )
  btn.innerHTML = avg.toFixed( 2 )
})


/**
 * debug
 */
window.generate = generate
window.render = render
