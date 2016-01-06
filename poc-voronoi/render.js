
'use strict';

var clamp = require( 'mathutil' ).clamp
var lerp = require( 'mathutil' ).lerp
var C = require( './constants' )

var Bezier = require( 'bezier-easing' )
var easeOutQuad = new Bezier( .55, 1, .55, 1 )
var easeInQuad = new Bezier( .75, .3, .8, .8 )
var easeInOutQuad = new Bezier( .8, 0, .7, 1 )
var easeInOut = new Bezier( .4, 0, .6, 1 )


var Noise = require( './noise' )
var noise = new Noise({
  persistence: 1 / Math.pow( 2, 2 ),
  frequency: 1 / Math.pow( 2, 7.5 )
})

var perturb = new Noise({
  min: -1,
  max: 1,
  persistence: 1 / Math.pow( 2, 2 ),
  frequency: 1 / Math.pow( 2, 7 )
})

function dist( p0, p1 ) {
  return Math.sqrt( Math.pow( p0[ 0 ] - p1[ 0 ], 2 ) + Math.pow( p0[ 1 ] - p1[ 1 ], 2 ) )
}

var gradient = function( origin, radius, target ) {
  let distance = clamp( dist( origin, target ), 0, 1 )
  return clamp( 1.0 - distance / radius, 0, 1 )
}

var BORDER_COLS = {
  [ C.EDGES.LEFT ]: [ 224, 111, 139 ],
  [ C.EDGES.BOTTOM ]: [ 247, 226, 107 ],
  [ C.EDGES.RIGHT ]: [ 163, 206, 39 ],
  [ C.EDGES.TOP ]: [ 49, 162, 242 ]
}

var BORDER_COLORS = [
  [ 224, 111, 139 ],
  [ 247, 226, 107 ],
  [ 163, 206, 39 ],
  [ 49, 162, 242 ]
]

var BIOME_COLORS = [
  [ 54, 54, 97 ],
  [ 196, 212, 170 ],
  [ 169, 204, 164 ]
]

function getBiome( value ) {
  if ( value >= 0 && value < .05 ) {
    return BIOME_COLORS[ 0 ]
  }
  if ( value >= .05 && value <= .75 ) {
    return BIOME_COLORS[ 1 ]
  }
  if ( value >= .75 && value <= 1 ) {
    return BIOME_COLORS[ 2 ]
  }
  throw new Error( 'nope, colour should never hit here' )
}

function makeColor( color, alpha ) {
  alpha = alpha || 1
  return 'rgba( ' + color[ 0 ] + ',' + color[ 1 ] + ',' + color[ 2 ] + ',' + alpha + ')'
}

function color( value, alpha )  {
  // let biome = BIOME_COLORS[ value * BIOME_COLORS.length | 0 ]
  // let biome = getBiome( value )
  //
  // biome = biome.map( col => lerp( value, 0, col ) | 0 )
  // return makeColor( biome, alpha || 1 )

  let col = [
    clamp( value, 0, 1 ) * 0xff | 0,
    clamp( value, 0, 1 ) * 0xff | 0,
    clamp( value, 0, 1 ) * 0xff | 0
  ]

  return makeColor( col, alpha || 1 )
}


/**
 * Checks if origin is close enough to target, given a variance
 */
function close( origin, target, variance ) {
  variance = variance || 5
  return ( origin < target + variance ) && ( origin > target - variance )
}

/**
 * Checks dimensions and location and returns an edge enum or null
 * Unfortunately not all border vertices land smack on 0 so we have to do
 * a little shuffling to check they are close enough
 */
function isBorderEdge( edge, region ) {
  let bounds = [
    region.origin[ 0 ],
    region.origin[ 1 ],
    region.origin[ 0 ] + region.dimensions[ 0 ],
    region.origin[ 1 ] + region.dimensions[ 1 ],
  ]
  // left
  if ( close( edge.va.x, bounds[ 0 ] ) && close( edge.vb.x, bounds[ 0 ] ) ) {
    return C.EDGES.LEFT
  }
  // right
  if ( close( edge.va.x, bounds[ 2 ] ) && close( edge.vb.x, bounds[ 2 ] ) ) {
    return C.EDGES.RIGHT
  }
  // top
  if ( close( edge.va.y, bounds[ 1 ] ) && close( edge.vb.y, bounds[ 1 ] ) ) {
    return C.EDGES.TOP
  }
  // bottom
  if ( close( edge.va.y, bounds[ 3 ] ) && close( edge.vb.y, bounds[ 3 ] ) ) {
    return C.EDGES.BOTTOM
  }
}






module.exports = function renderable( canvas ) {

  var ctx = canvas.getContext( '2d' )

  function renderEdge( edge, col, width ) {
    col = col || 'rgb( 244, 0, 0 )'
    ctx.beginPath()
    ctx.moveTo( edge.va.x, edge.va.y )
    ctx.lineTo( edge.vb.x, edge.vb.y )
    ctx.strokeStyle = col
    ctx.lineWidth = width || 1
    ctx.stroke()
  }

  function renderPoint( point, col ) {
    col = col || 'rgb( 0, 64, 232 )'
    ctx.fillRect( point.x - 1, point.y - 1, 3, 3 )
  }

  function renderCell( cell, col ) {
    col = col || 'rgb( 220, 220, 220 )'
    let halfedges = cell.halfedges
    let point = halfedges[ 0 ].getEndpoint()
    ctx.beginPath()
    // start path
    ctx.moveTo( point.x, point.y )

    // iterate path
    for ( let j = 0; j < halfedges.length; j++ ) {
      let point = halfedges[ j ].getEndpoint()
      ctx.lineTo( point.x, point.y )
    }

    // close polygon
    ctx.lineTo( point.x, point.y )

    ctx.fillStyle = col
    ctx.fill()

    // Add stroke or you miss the edges
    ctx.strokeStyle = col
    ctx.stroke()
  }

  return function render( region ) {
    // console.log( region )
    var start = performance.now()
    // console.log( 'rendering' )

    var diagram = region.diagram


    // Render cells
    for ( let i = 0; i < diagram.cells.length; i++ ) {
      let cell = diagram.cells[ i ]

      // let col = makeColor( [ i * 2, i * 2, i * 2 ], 1 )
      // let col = color( noise.getEase( cell.site.x, cell.site.y ), 1 )
      //
      // if ( cell.isBorder ) {
      //   col = color( noise.getEase( cell.site.x, cell.site.y ) * .25, 1 )
      // }
      //
      // renderCell( cell, col )


      // Grab curved noise line
      let value = noise.get( cell.site.x, cell.site.y )
      // value = easeInOut.get( value )  // blend

      // Add lazy radial gradient distance
      let unit = [
        ( cell.site.x - region.origin[ 0 ] ) / region.dimensions[ 0 ],
        ( cell.site.y - region.origin[ 1 ] ) / region.dimensions[ 1 ]
      ]
      let center = [ .5, .5 ]
      let radius = .5
      let distance = dist( unit, center )
      distance *= 1.0 + perturb.get( cell.site.x, cell.site.y ) * .25 // add noise

      // value *= easeOutQuad.get( 1.0 - distance / radius )

      // Add perturb ridges
      // value *= Math.abs( .5 + perturb.get( cell.site.x, cell.site.y ) * .5 )

      // Add right circular gradient
      // center = [ region.origin[ 0 ] ? 0.0 : 1.0, 0 ]
      // radius = 1.0
      // distance = dist( unit, center )
      // distance *= 1.0 + perturb.get( cell.site.x, cell.site.y ) * .25 // add noise
      //
      // value *= easeOutQuad.get( 1.0 - distance / radius )
      //
      // // Add right circular gradient
      // center = [ region.origin[ 0 ] ? 0.0 : 1.0, 1.0 ]
      // radius = 1.0
      // distance = dist( unit, center )
      // distance *= 1.0 + perturb.get( cell.site.x, cell.site.y ) * .25 // add noise
      //
      // value *= easeOutQuad.get( 1.0 - distance / radius )

      // @TODO each region corner should be marked either land or water,
      // land corners get an influence, leaving water corners darker
      // @TODO use an influence map that helps determine water/land mix, any of
      // number of influences/powers can be specified but cardinal points/center
      // would be a good starting point
      let power = .15
      let influences = [
        // gradient( [ .5, .5 ], .5, unit ),
        // gradient( [ 1.0, 0.0 ], power, unit ),
        // gradient( [ 1.0, 1.0 ], power, unit ),
        gradient( [ 1.0, .5 ], power, unit ),
        // gradient( [ .5, 1.0 ], power, unit ),
        // gradient( [ 0.0, 0.0 ], power, unit ),
        // gradient( [ 0.0, 1.0 ], power, unit )
      ]
      // average influences
      // let influenceMap = influences.reduce( ( prev, curr ) => prev + curr ) // additive (will blow out whites, should be clamped)
      // let influenceMap = influences.reduce( ( prev, curr ) => prev + curr ) / influences.length (average, reduces overall power)
      let influenceMap = clamp( influences.reduce( ( prev, curr ) => prev + curr ), 0, 1 )
      influenceMap = easeOutQuad.get( influenceMap )
      influenceMap *= 1.0 + perturb.get( cell.site.x, cell.site.y ) * .5 // add noise

      value *= influenceMap

      renderCell( cell, color( value ) )
    }


    // Render border edges
    // for ( let i = 0; i < diagram.edges.length; i++ ) {
    //   let edge = diagram.edges[ i ]
    //   if ( edge.isBorder ) {
    //     renderEdge( edge, makeColor( BORDER_COLS[ edge.isBorder ] ), 4 )
    //   }
    // }

    // Render border cells
    // for ( let i = 0; i < diagram.cells.length; i++ ) {
    //   let cell = diagram.cells[ i ]
    //   if ( cell.isBorder ) {
    //     renderCell( cell, makeColor( BORDER_COLS[ cell.isBorder ] ) )
    //   }
    // }

    // // Render border cells
    // for ( let i = 0; i < diagram.edges.length; i++ ) {
    //   let edge = diagram.edges[ i ]
    //   if ( !edge.rSite ) {
    //     // Get which border
    //     var col
    //     if ( isBorderEdge( edge, region ) === C.EDGES.LEFT ) {
    //       col = BORDER_COLORS[ 0 ]
    //     }
    //     if ( isBorderEdge( edge, region ) === C.EDGES.RIGHT ) {
    //       col = BORDER_COLORS[ 2 ]
    //     }
    //     if ( isBorderEdge( edge, region ) === C.EDGES.TOP ) {
    //       col = BORDER_COLORS[ 1 ]
    //     }
    //     if ( isBorderEdge( edge, region ) === C.EDGES.BOTTOM ) {
    //       col = BORDER_COLORS[ 3 ]
    //     }
    //
    //     // renderCell( diagram.cells[ edge.lSite.voronoiId ], makeColor( col ) )
    //
    //     // Just colour them all darker than their normal colour, simulating a vignette
    //     let cell = diagram.cells[ edge.lSite.voronoiId ]
    //     col = color( noise.getEase( cell.site.x, cell.site.y ) * .25 )
    //
    //     renderCell( cell, col )
    //   }
    // }

    // Render vertices
    // ctx.fillStyle = 'rgb( 0, 0, 255 )'
    // for ( let i = 0; i < diagram.vertices.length; i++ ) {
    //   let vertex = diagram.vertices[ i ]
    //   ctx.fillRect( vertex.x - 1, vertex.y - 1, 3, 3 )
    // }

    // Render edges
    // for ( let i = 0; i < diagram.edges.length; i++ ) {
    //   let edge = diagram.edges[ i ]
    //   renderEdge( edge, 'rgb( 230, 230, 242 )' )
    // }

    // Render initial seed sites
    // ctx.fillStyle = 'rgb( 255, 0, 0 )'
    // for ( let i = 0; i < diagram.cells.length; i++ ) {
    //   let site = diagram.cells[ i ].site
    //   ctx.fillRect( site.x - 1, site.y - 1, 3, 3 )
    // }

    // console.log( 'rendering done', performance.now() - start )
  }
}
