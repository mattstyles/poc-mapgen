
'use strict';

var fit = require( 'canvas-fit' )
var ndarray = require( 'ndarray' )
window.baboon = require( 'baboon-image' )

var WIDTH = 512
var HEIGHT = 512

var canvas = document.createElement( 'canvas' )
window.addEventListener( 'resize', fit( canvas ), false )
document.body.appendChild( canvas )

var ctx = canvas.getContext( '2d' )
var image = ctx.createImageData( WIDTH, HEIGHT )
var data = image.data

window.image = image

var nd = ndarray( new Float32Array( WIDTH * HEIGHT ), [ WIDTH, HEIGHT ] )
window.nd = nd

function generate() {
  var start = performance.now()
  for( var y = 0; y < HEIGHT; y++ ) {
    for( var x = 0; x < WIDTH; x++ ) {
      nd.set( x, y, Math.random() )
    }
  }
  console.log( 'heightmap generation time:', performance.now() - start )
}

function render() {
  var start = performance.now()
  var index = 0
  nd.data.forEach( ( h, i ) => {
    index = i * 4
    data[ index ] = h * 255 | 0
    data[ index + 1 ] = h * 255 | 0
    data[ index + 2 ] = h * 255 | 0
    data[ index + 3 ] = 255
  })

  ctx.putImageData( image, 0, 0 )
  console.log( 'render time:', performance.now() - start )
}


generate()
render()

var start = 0
var count = 0
var time = 0
var timeout = setTimeout( function frame() {
  start = performance.now()
  render()
  time += performance.now() - start
  count++
  timeout = setTimeout( frame, 100 )
}, 100 )

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
  console.log( 'average render time', avg )
  btn.innerHTML = avg.toFixed( 2 )
})
