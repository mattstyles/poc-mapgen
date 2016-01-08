
'use strict'

/**
 * Renders region biome distribution data to a canvas and grabs
 * the pixel data
 */

var ndarray = require( 'ndarray' )
var toMap = require( 'to-map' )

// @TODO biome info should not live here and all this stuff should
// be kept together in one place
var BIOME_COLORS = toMap({
  'OCEAN': [ 48, 52, 109 ],
  'SNOW': [ 238, 240, 249 ],
  'TUNDRA': [ 214, 222, 232 ],
  'SCORCHED': [ 178, 183, 182 ],
  'TAIGA': [ 133, 181, 165 ],
  'SHRUBLAND': [ 109, 107, 44 ],
  'TEMPERATE_DESERT': [ 200, 194, 82 ],
  'TEMPERATE_RAINFOREST': [ 52, 131, 96 ],
  'TEMPERATE_FOREST': [ 52, 101, 36 ],
  'GRASSLAND': [ 110, 170, 62 ],
  'DESERT': [ 232, 212, 94 ],
  'TROPICAL_RAINFOREST': [ 92, 162, 125 ],
  'PLAINS': [ 162, 192, 62 ],
  'TROPICAL_FOREST': [ 102, 204, 144 ]
})

var BIOME_ID = [
  'OCEAN',
  'SNOW',
  'TUNDRA',
  'SCORCHED',
  'TAIGA',
  'SHRUBLAND',
  'TEMPERATE_DESERT',
  'TEMPERATE_RAINFOREST',
  'TEMPERATE_FOREST',
  'GRASSLAND',
  'DESERT',
  'TROPICAL_RAINFOREST',
  'PLAINS',
  'TROPICAL_FOREST'
]

function within( value, min, max ) {
  return ( value > min ) && ( value < max )
}

const TOLERANCE = 10

// Use tolerance to try and find the most likely biome colour
function findBiome( color ) {
  let values = BIOME_COLORS.entries()
  let col = values.next()
  let test = false
  let count = 0
  // Iterate through map entries
  while( !col.done ) {
    // Test if each array entry colour equals the colour passed in
    test = col.value[ 1 ].reduce( ( prev, curr, index ) => {
      // return curr == color [ index ]
      return within( curr, color[ index ] - TOLERANCE, color[ index ] + TOLERANCE )
    }, test )

    // If the colours match then return the map key as it is the biome id we're after
    if ( test ) {
      return col.value[ 0 ]
      // Actually, return the index and pack that as an id into the ndarray
      // return count
    }
    col = values.next()
    count++
  }

  throw new Error( 'Can not find biome id, which is odd as unpacking should be the inverse of packing: ' + color )
}

function makeColor( color, alpha ) {
  alpha = alpha || 1
  return 'rgba( ' + color[ 0 ] + ',' + color[ 1 ] + ',' + color[ 2 ] + ',' + alpha + ')'
}

/**
 * Renders the generated ndarray texture and dumps to DOM
 */
function dummyRenderTextureArray( tex ) {
  let canvas = document.createElement( 'canvas' )
  canvas.width = tex.shape[ 0 ]
  canvas.height = tex.shape[ 1 ]
  canvas.setAttribute( 'id', 'biomeTexture' )
  let ctx = canvas.getContext( '2d' )
  document.body.appendChild( canvas )

  function renderPoint( x, y, col ) {
    ctx.fillStyle = col
    ctx.fillRect( x, y, 1, 1 )
  }

  for ( var x = 0; x < tex.shape[ 0 ]; x++ ) {
    for ( var y = 0; y < tex.shape[ 0 ]; y++ ) {
      // let col = BIOME_COLORS.get( BIOME_ID[ tex.get( x, y ) ] )
      // console.log( BIOME_ID[ tex.get( x, y ) ] )
      let col = BIOME_COLORS.get( tex.get( x, y ) )
      // console.log( BIOME_COLORS.get( tex.get( x, y ) ) )
      renderPoint( x, y, makeColor( col ) )
    }
  }
}


/**
 * Antialiasing is killing things
 * When drawing the voronoi diagram the polygons become antialiased which means
 * unpacking the data back into biome ids is impossible.
 */
module.exports = function renderToTexture( region ) {
  if ( !document ) {
    throw new Error( 'Can not find ze DOM' )
  }

  let canvas = document.createElement( 'canvas' )
  canvas.width = region.dimensions[ 0 ]
  canvas.height = region.dimensions[ 1 ]
  canvas.setAttribute( 'id', 'imagePack' )
  let ctx = canvas.getContext( '2d' )

  // Antialising line drawing and fills doesnt seem to work very well
  ctx.imageSmoothingEnabled = false

  // Try small translate to nuke antialiasing
  ctx.translate( .5, .5 )

  /**
   * Renders a cell into the context
   * all points need to be translated from world into local coords
   */
  function renderCell( cell, col ) {
    col = col || 'rgb( 220, 220, 220 )'
    let halfedges = cell.halfedges
    let point = halfedges[ 0 ].getStartpoint()
    ctx.beginPath()
    // start path
    ctx.moveTo( point.x - region.origin[ 0 ] - 1, point.y - region.origin[ 0 ] - 1 )

    // iterate path
    for ( let i = 0; i < halfedges.length; i++ ) {
      let point = halfedges[ i ].getEndpoint()
      ctx.lineTo( point.x - region.origin[ 0 ] - 1, point.y - region.origin[ 0 ] - 1 )
    }

    ctx.fillStyle = col
    ctx.fill()

    // Add stroke or you miss the edges
    ctx.strokeStyle = col
    ctx.stroke()
  }

  // Render to canvas and grab the image data
  for ( var i = 0; i < region.diagram.cells.length; i++ ) {
    let cell = region.diagram.cells[ i ]
    let col = BIOME_COLORS.get( cell.biome.toUpperCase() )
    renderCell( cell, makeColor( col ) )
  }

  let imageData = ctx.getImageData( 0, 0, region.dimensions[ 0 ], region.dimensions[ 1 ] )
  let pixels = imageData.data

  // pack into an ndarray
  // decode colour components back into biome identifier
  let texture = ndarray([ region.dimensions[ 0 ] * region.dimensions[ 1 ] ], [
    region.dimensions[ 0 ],
    region.dimensions[ 1 ]
  ])

  // Pack pixel data into an ndarray
  var image = ndarray(
    new Uint8Array( pixels ),
    [ canvas.width, canvas.height, 4 ],
    [ 4, 4 * canvas.width, 1 ],
    0
  )

  var errorCount = 0
  var lastId = 0

  // Grab rgb component and stuff biome id into texture array
  for ( var y = 0; y < canvas.height; y++ ) {
    for ( var x = 0; x < canvas.width; x++ ) {
      let id = 0
      try {
        id = findBiome([
          image.get( x, y, 0 ),
          image.get( x, y, 1 ),
          image.get( x, y, 2 )
        ])
      } catch( err ) {
        // console.error( err )
        errorCount++

        // Due to antialiasing, smoothing and other canvas oddities
        // the rendered texture might not be exact. We try to shield values by
        // testing against a range but small inaccuracies get through, so just
        // use the previous value and that will be close enough, could try sampling
        // against known values
        id = lastId
      }

      texture.set( x, y, id )
      lastId = id
    }
  }

  console.log( 'errors:', errorCount )

  console.log( 'appending canvas' )
  document.body.appendChild( canvas )

  dummyRenderTextureArray( texture )

  return texture
  // return canvas

}
