
'use strict';

var clamp = require( 'mathutil' ).clamp

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

// Turns a nice curve into a stepped curve
// Value is expected to be 0...1
function step( value, divisions ) {
  var d = 1 / divisions || 2
  for( var i = 0; i < 1; i += d ) {
    if ( value >= i && value < i + d ) {
      return i
    }
  }
  console.warn( 'step should never produce this', value )
  return 0
}

var BLOCK_SIZE = 2
var WATER_LEVEL = .5
var HEIGHT_STEP = 20

module.exports = function renderable( canvas ) {
  var ctx = canvas.getContext( '2d' )

  var height
  var col

  function sample( map, x, y, min, max ) {
    let count = 0
    let range = ( max - min ) + 1
    for ( var i = y + min; i <= y + max; i++ ) {
      for ( var j = x + min; j <= x + max; j++ ) {
        count += map.get( i, j ) || 0
      }
    }
    return count / ( range * range )
  }

  window.sample = sample

  return function render( map ) {
    var start = performance.now()
    ctx.clearRect( 0, 0, map.shape[ 0 ] * BLOCK_SIZE, map.shape[ 1 ] * BLOCK_SIZE )
    for ( var y = 0; y < map.shape[ 1 ]; y++ ) {
      for ( var x = 0; x < map.shape[ 0 ]; x++ ) {
        height = map.get( x, y )
        //height = sample( map, x, y, -1, 1 )

        // height = step( height, HEIGHT_STEP )
        // col = color( height < WATER_LEVEL ? 0 : 1, 1 )
        col = color( height < WATER_LEVEL ? height * .5 : height, 1 )
        // col = color( height )


        ctx.fillStyle = col
        ctx.fillRect( x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE )
      }
    }
    console.log( 'render done:', performance.now() - start )
  }
}
