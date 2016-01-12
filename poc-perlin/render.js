
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

var BLOCK_SIZE = [ 12, 16 ]
var SHOW_SIZE = [ 38 * ( 32 / BLOCK_SIZE[ 0 ] ), 24 * ( 32 / BLOCK_SIZE[ 1 ] ) ]
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
  var char = '#'

  ctx.font = BLOCK_SIZE[ 1 ] + 'px "DejaVu Sans Mono"'

  function render( map ) {
    var start = performance.now()
    // ctx.clearRect( 0, 0, map.shape[ 0 ] * BLOCK_SIZE, map.shape[ 1 ] * BLOCK_SIZE )
    ctx.clearRect( 0, 0, SHOW_SIZE[ 0 ] * BLOCK_SIZE[ 0 ], SHOW_SIZE[ 1 ] * BLOCK_SIZE[ 1 ] )

    // for ( var i = 0; i < map.shape[ 1 ]; i++ ) {
    //   for ( var j = 0; j < map.shape[ 0 ]; j++ ) {
    for ( var i = x; i < x + SHOW_SIZE[ 0 ]; i++ ) {
      for ( var j = y; j < y + SHOW_SIZE[ 1 ]; j++ ) {
        cell = map.get( i, j )

        // Can happen sometimes when playing with map and render sizes
        if ( !cell ) {
          return
        }

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

        col = makeColor( applyAlpha( biome, height ) )
        // col = makeColor( applyAlpha( biome, step( height, HEIGHT_STEP ) ) )

        // test individual cell features
        // col = color( temp )


        ctx.fillStyle = col
        // ctx.fillRect( ( i - x ) * BLOCK_SIZE, ( j - y ) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE )

        char = cell[ 3 ] === 'OCEAN' ? '#' : '.'
        ctx.fillText( char, ( i - x ) * BLOCK_SIZE[ 0 ], ( j - y ) * BLOCK_SIZE[ 1 ] )
      }
    }
    // console.log( 'render done:', performance.now() - start )

    // Render a dummy character
    char = '@'
    ctx.fillStyle = makeColor( [ 218, 212, 94 ] )
    ctx.fillText( char, ( SHOW_SIZE[ 0 ] * .5 ) * BLOCK_SIZE[ 0 ], ( SHOW_SIZE[ 1 ] * .5 ) * BLOCK_SIZE[ 1 ] )
  }

  var quay = new Quay()

  quay.on( '<right>', event => {
    if ( x >= map.shape[ 0 ] - SHOW_SIZE[ 0 ] ) return
    x += ( 32 / BLOCK_SIZE[ 0 ] ) | 0
  })
  quay.on( '<left>', event => {
    if ( x <= 0 ) return
    x -= ( 32 / BLOCK_SIZE[ 0 ] ) | 0
  })
  quay.on( '<down>', event => {
    if ( y >= map.shape[ 1 ] - SHOW_SIZE[ 1 ] ) return
    y += ( 32 / BLOCK_SIZE[ 1 ] ) | 0
  })
  quay.on( '<up>', event => {
    if ( y <= 0 ) return
    y -= ( 32 / BLOCK_SIZE[ 1 ] ) | 0
  })

  canvas.addEventListener( 'click', event => {
    var i = ( event.x / BLOCK_SIZE[ 0 ] | 0 ) + x
    var j =  ( event.y / BLOCK_SIZE[ 1 ] | 0 ) + y
    let cell = map.get( i, j )
    console.log( '<' + i + ', ' + j + '>' )
    console.log( 'biome:%c' + cell[ 3 ], 'color:' + makeColor( BIOME_COLORS[ cell[ 3 ] ] ) )
    console.log( '  elevation:   %c' + cell[ 0 ].toFixed( 3 ), 'color:' + makeColor( applyAlpha( [ 190, 190, 190 ], cell[ 0 ] ) ) )
    console.log( '  temperature: %c' + cell[ 1 ].toFixed( 3 ), 'color:' + makeColor( applyAlpha( [ 224, 111, 139 ], cell[ 1 ] ) ) )
    console.log( '  moisture:    %c' + cell[ 2 ].toFixed( 3 ), 'color:' + makeColor( applyAlpha( [ 49, 162, 242 ], cell[ 2 ] ) ) )
  })

  var biomeText = document.querySelector( '.js-biomeText' )
  canvas.addEventListener( 'mousemove', event => {
    let cell = map.get( ( event.x / BLOCK_SIZE[ 0 ] | 0 ) + x, ( event.y / BLOCK_SIZE[ 1 ] | 0 ) + y )
    biomeText.innerHTML = cell ? cell[ 3 ] : ''
  })


  return render
}
