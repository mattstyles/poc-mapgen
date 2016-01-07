
'use strict';

var clamp = require( 'mathutil' ).clamp
var lerp = require( 'mathutil' ).lerp
var C = require( './constants' )
var varying = require( './options' )

var Bezier = require( 'bezier-easing' )
var easeOutQuad = new Bezier( .55, 1, .55, 1 )
var easeInQuad = new Bezier( .75, .3, .8, .8 )
var easeInOutQuad = new Bezier( .8, 0, .7, 1 )
var easeInOut = new Bezier( .4, 0, .6, 1 )


function dist( p0, p1 ) {
  return Math.sqrt( Math.pow( p0[ 0 ] - p1[ 0 ], 2 ) + Math.pow( p0[ 1 ] - p1[ 1 ], 2 ) )
}

function gradient( origin, radius, target ) {
  let distance = clamp( dist( origin, target ), 0, 1 )
  return clamp( 1.0 - distance / radius, 0, 1 )
}

const PI2 = Math.PI * 2

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

  function renderPath( path, col ) {
    col = col || 'rgb( 20, 220, 120 )'
    ctx.beginPath()
    ctx.moveTo( path[ 0 ][ 0 ], path[ 0 ][ 1 ] )
    path.forEach( point => {
      ctx.lineTo( point[ 0 ], point[ 1 ] )
    })
    ctx.strokeStyle = col
    ctx.lineWidth = 2
    ctx.stroke()
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

  function renderCircle( x, y, radius, col ) {
    col = col || 'rgb( 247, 226, 107 )'
    ctx.beginPath()
    ctx.arc( x, y, radius, 0, PI2, false )
    ctx.fillStyle = col
    ctx.fill()
  }

  /**
   * Master render function
   */
  return function render( region ) {
    // console.log( region )
    var start = performance.now()
    // console.log( 'rendering' )

    var diagram = region.diagram


    // Render cell elevation map
    for ( let i = 0; i < diagram.cells.length; i++ ) {
      let cell = diagram.cells[ i ]
      renderCell( cell, color( cell.elevation ) )
    }

    // Render cell moisture map
    // @TODO canvas does not like rendering semi-opaque fills and strokes together,
    // there is a work-around but its messy.
    for ( let i = 0; i < diagram.cells.length; i++ ) {
      let cell = diagram.cells[ i ]
      if ( cell.elevation > 0.05 ) {
        renderCell( cell, makeColor( [
          0x22,
          0x2c,
          ( .25 + cell.moisture * .75 ) * 0xff | 0
        ], .5 ))
      }
    }

    // Render cell temperature map
    // @TODO canvas does not like rendering semi-opaque fills and strokes together,
    // there is a work-around but its messy.
    for ( let i = 0; i < diagram.cells.length; i++ ) {
      let cell = diagram.cells[ i ]
      if ( cell.elevation > 0.05 ) {
        renderCell( cell, makeColor( [
          ( .75 + cell.temperature * .25 ) * 0xff | 0,
          0x6c,
          0x04
        ], .5 ))
      }
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

    // Render all influences
    // var col = 'rgba( 247, 206, 128, .5 )'
    // for ( let i = 0; i < region.influences.length; i++ ) {
    //   let inf = region.influences[ i ]
    //   // translate to region coords
    //   let x = region.origin[ 0 ] + inf.origin[ 0 ] * region.dimensions[ 0 ]
    //   let y = region.origin[ 1 ] + inf.origin[ 1 ] * region.dimensions[ 1 ]
    //   renderCircle( x, y, inf.pow * region.dimensions[ 0 ] * 1, col ) // reduce 1 to reduce circle size
    // }

    // Render child/parent influences
    // for ( let i = 0; i < region.influences.length; i++ ) {
    //   let inf = region.influences[ i ]
    //   // translate to region coords
    //   let x = region.origin[ 0 ] + inf.origin[ 0 ] * region.dimensions[ 0 ]
    //   let y = region.origin[ 1 ] + inf.origin[ 1 ] * region.dimensions[ 1 ]
    //
    //   if ( inf.parent ) {
    //     let point = [
    //       region.origin[ 0 ] + inf.parent[ 0 ] * region.dimensions[ 0 ],
    //       region.origin[ 1 ] + inf.parent[ 1 ] * region.dimensions[ 1 ]
    //     ]
    //     // Render parent and guess area of influence
    //     renderCircle( point[ 0 ], point[ 1 ], inf.pow * 1.25 * region.dimensions[ 0 ], 'rgba( 220, 50, 0, .5 )'  )
    //
    //     // Render child
    //     renderCircle( x, y, inf.pow * region.dimensions[ 0 ], 'rgba( 255, 0, 0, .25 )')
    //
    //     // Render the join
    //     renderPath([
    //       [ x, y ],
    //       point
    //     ])
    //   }
    // }


    // console.log( 'rendering done', performance.now() - start )
  }
}
