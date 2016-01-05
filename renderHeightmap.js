
'use strict';

var clamp = require( 'mathutil' ).clamp
var lerp = require( 'mathutil' ).lerp
var C = require( './constants' )
var iterate = require( './iterate' )
var noise = require( './noise' )

function makeColor( color, alpha ) {
  alpha = alpha || 1
  return 'rgba( ' + color[ 0 ] + ',' + color[ 1 ] + ',' + color[ 2 ] + ',' + alpha + ')'
}

function color( value, alpha )  {
  let color = [
    clamp( value, 0, 1 ) * 0xff | 0,
    clamp( value, 0, 1 ) * 0xff | 0,
    clamp( value, 0, 1 ) * 0xff | 0
  ]

  return makeColor( color, alpha || 1 )
}

module.exports = function renderable( canvas ) {

  var ctx = canvas.getContext( '2d' )


  return function render( opts ) {
    var start = performance.now()
    console.log( 'rendering heightmap' )

    ctx.clearRect( 0, 0, canvas.width, canvas.height )

    for ( var y = opts.y; y < opts.y + opts.height; y++ ) {
      for ( var x = opts.x; x < opts.x + opts.width; x++ ) {
        let col = color( noise.getEase( x, y ), 1 )

        ctx.fillStyle = col
        ctx.fillRect( x, y, 1, 1 )
      }
    }


    console.log( 'rendering done', performance.now() - start )
  }
}
