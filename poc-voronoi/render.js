
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


    // Render cells
    for ( let i = 0; i < diagram.cells.length; i++ ) {
      let cell = diagram.cells[ i ]

      // Grab curved noise line
      let value = varying.heightmap.get( cell.site.x, cell.site.y )
      value = easeInOut.get( value )  // blend

      // Normalize x,y to 0...1
      let unit = [
        ( cell.site.x - region.origin[ 0 ] ) / region.dimensions[ 0 ],
        ( cell.site.y - region.origin[ 1 ] ) / region.dimensions[ 1 ]
      ]

      // Add perturb ridges
      //value *= Math.abs( .5 + varying.random.get( cell.site.x, cell.site.y ) * .5 )

      // Use circular gradients to calculate influence regions
      let influences = region.influences.map( inf => {
        return gradient( inf.origin, inf.pow, unit )
      })
      // average influences and clamp
      let influenceMap = clamp( influences.reduce( ( prev, curr ) => prev + curr ), 0, 1 )

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

    // Render influences
    // var col = 'rgba( 247, 206, 128, .75 )'
    // for ( let i = 0; i < region.influences.length; i++ ) {
    //   let inf = region.influences[ i ]
    //   // translate to region coords
    //   let x = region.origin[ 0 ] + inf.origin[ 0 ] * region.dimensions[ 0 ]
    //   let y = region.origin[ 1 ] + inf.origin[ 1 ] * region.dimensions[ 1 ]
    //   renderCircle( x, y, inf.pow * region.dimensions[ 0 ] * 1, col )
    // }

    // console.log( 'rendering done', performance.now() - start )
  }
}
