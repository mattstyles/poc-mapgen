
'use strict';

var fit = require( 'canvas-fit' )
var clamp = require( 'mathutil' ).clamp
var lerp = require( 'mathutil' ).lerp
var C = require( './constants' )
var iterate = require( './iterate' )

var CHUNK_WIDTH = C.CHUNK_SIZE * C.TILE_SIZE
var CHUNK_HEIGHT = C.CHUNK_SIZE * C.TILE_SIZE

var BIOME_COLORS = [
  [ 255, 0, 0 ],
  [ 0, 255, 0 ],
  [ 0, 0, 255 ]
]

function color( value, biome )  {
  // let color = BIOME_COLORS[ biome ]
  // color = color.map( col => lerp( value, 0, col ) | 0 )
  let color = [
    clamp( value, 0, 1 ) * 0xff | 0,
    clamp( value, 0, 1 ) * 0xff | 0,
    clamp( value, 0, 1 ) * 0xff | 0
  ]

  return 'rgb( ' + color[ 0 ] + ',' + color[ 1 ] + ',' + color[ 2 ] + ')'
}

module.exports = function renderable( canvas ) {

  var ctx = canvas.getContext( '2d' )

  document.body.appendChild( canvas )

  window.addEventListener( 'resize', fit( canvas ), false )

  return function render( diagram ) {
    console.log( diagram )
    var start = performance.now()
    console.log( 'rendering' )

    // if ( !chunks ) {
    //   console.error( 'no chunks to render' )
    //   return
    // }
    //
    // // Iterate over each block in the map
    // iterate( chunks, function( x, y ) {
    //   var chunk = this.get( x, y )
    //
    //   // Iterate over each tile within the chunk
    //   iterate( chunk.data, function( i, j ) {
    //     var tile = this.get( i, j )
    //
    //     ctx.fillStyle = color( tile, chunk.biome )
    //     ctx.fillRect(
    //       ( x * CHUNK_WIDTH ) + ( i * C.TILE_SIZE ),
    //       ( y * CHUNK_WIDTH ) + ( j * C.TILE_SIZE ),
    //       C.TILE_SIZE,
    //       C.TILE_SIZE
    //     )
    //   })
    // })

    // Render initial seed sites
    ctx.fillStyle = 'rgb( 255, 0, 0 )'
    for ( let i = 0; i < diagram._sites.length; i++ ) {
      let site = diagram._sites[ i ]
      ctx.fillRect( site.x - 1, site.y - 1, 3, 3 )
    }

    // Render vertices
    ctx.fillStyle = 'rgb( 0, 0, 0 )'
    for ( let i = 0; i < diagram.vertices.length; i++ ) {
      let vertex = diagram.vertices[ i ]
      ctx.fillRect( vertex.x - 1, vertex.y - 1, 3, 3 )
    }

    // Render edges
    for ( let i = 0; i < diagram.edges.length; i++ ) {
      let edge = diagram.edges[ i ]
      ctx.beginPath()
      ctx.moveTo( edge.va.x, edge.va.y )
      ctx.lineTo( edge.vb.x, edge.vb.y )
      ctx.strokeStyle = 'rgb( 0, 0, 255 )'
      ctx.stroke()
    }

    console.log( 'rendering done', performance.now() - start )
  }
}
