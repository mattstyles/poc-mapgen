
'use strict';

var biomes = require( './biomes' )
var Quay = require( 'quay' )
var clamp = require( 'mathutil' ).clamp

var BIOME_COLORS = {
  'OCEAN': [ 48, 52, 109 ],
  'SNOW': [ 238, 240, 249 ],
  'TUNDRA': [ 214, 222, 232 ],
  'BARREN': [ 178, 183, 202 ],
  'TAIGA': [ 133, 181, 165 ],
  'SHRUBLAND': [ 109, 107, 44 ],
  'COLD_DESERT': [ 200, 194, 172 ],
  'WOODLAND': [ 52, 131, 96 ],
  'FOREST': [ 52, 101, 36 ],
  'GRASSLAND': [ 110, 170, 62 ],
  'DESERT': [ 232, 212, 94 ],
  'RAINFOREST': [ 92, 162, 125 ],
  'PLAINS': [ 162, 192, 62 ],
  'JUNGLE': [ 102, 204, 144 ]
}

function applyAlpha( color, alpha ) {
  return color.map( c => c * alpha | 0 )
}

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

var BLOCK_SIZE = 32
var SHOW_SIZE = [ 38, 24 ]
var WATER_LEVEL = .5
var HEIGHT_STEP = 40

module.exports = function renderable( canvas ) {
  var ctx = canvas.getContext( '2d' )

  var height
  var moisture
  var temp
  var cell
  var col
  var biome

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

  var x = 0
  var y = 0

  function render( map ) {
    var start = performance.now()
    // ctx.clearRect( 0, 0, map.shape[ 0 ] * BLOCK_SIZE, map.shape[ 1 ] * BLOCK_SIZE )
    ctx.clearRect( 0, 0, SHOW_SIZE[ 0 ] * BLOCK_SIZE, SHOW_SIZE[ 1 ] * BLOCK_SIZE )

    // for ( var i = 0; i < map.shape[ 1 ]; i++ ) {
    //   for ( var j = 0; j < map.shape[ 0 ]; j++ ) {
    for ( var i = x; i < x + SHOW_SIZE[ 0 ]; i++ ) {
      for ( var j = y; j < y + SHOW_SIZE[ 1 ]; j++ ) {
        cell = map.get( i, j )
        height = cell[ 0 ]
        temp = cell[ 1 ]
        moisture = cell[ 2 ]

        //height = sample( map, x, y, -1, 1 )

        // height = step( height, HEIGHT_STEP )
        // col = color( height < WATER_LEVEL ? 0 : 1, 1 )
        // col = color( height < WATER_LEVEL ? height * .5 : height, 1 )
        // col = color( height )

        // col = makeColor([
        //   clamp( height, 0, 1 ) * 0xff | 0,
        //   clamp( temp, 0, 1 ) * 0xff | 0,
        //   clamp( moisture, 0, 1 ) * 0xff | 0
        // ])

        biome = BIOME_COLORS[ cell[ 3 ] ]

        if ( height < WATER_LEVEL ) {
          biome = BIOME_COLORS.OCEAN
        }

        // col = makeColor( applyAlpha( biome, height ) )
        col = makeColor( applyAlpha( biome, step( height, HEIGHT_STEP ) ) )

        // test individual cell features
        // col = color( height )


        ctx.fillStyle = col
        ctx.fillRect( ( i - x ) * BLOCK_SIZE, ( j - y ) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE )
      }
    }
    // console.log( 'render done:', performance.now() - start )
  }

  var quay = new Quay()

  quay.on( '<down>', event => {
    if ( y >= map.shape[ 1 ] - SHOW_SIZE[ 0 ] ) return
    y++
  })
  quay.on( '<up>', event => {
    if ( y <= 0 ) return
    y--
  })
  quay.on( '<right>', event => {
    if ( x >= map.shape[ 0 ] - SHOW_SIZE[ 1 ] ) return
    x++
  })
  quay.on( '<left>', event => {
    if ( x <= 0 ) return
    x--
  })

  canvas.addEventListener( 'click', event => {
    console.log( map.get( ( event.x / BLOCK_SIZE | 0 ) + x, ( event.y / BLOCK_SIZE | 0 ) + y ) )
  })


  return render
}
