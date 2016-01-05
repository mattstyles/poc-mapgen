
'use strict';

var clamp = require( 'mathutil' ).clamp
var lerp = require( 'mathutil' ).lerp
var Noise = require( './noise' )

var noise = new Noise({
  persistence: 1 / Math.pow( 2, 2 ),
  frequency: 1 / Math.pow( 2, 10 )
})


var BIOME_COLORS = [
  [ 255, 0, 0 ],
  [ 0, 255, 0 ],
  [ 0, 0, 255 ]
]

function makeColor( color, alpha ) {
  alpha = alpha || 1
  return 'rgba( ' + color[ 0 ] + ',' + color[ 1 ] + ',' + color[ 2 ] + ',' + alpha + ')'
}

function color( value, alpha )  {
  let biome = BIOME_COLORS[ value * BIOME_COLORS.length | 0 ]
  biome = biome.map( col => lerp( value, 0, col ) | 0 )

  // let col = [
  //   clamp( value, 0, 1 ) * 0xff | 0,
  //   clamp( value, 0, 1 ) * 0xff | 0,
  //   clamp( value, 0, 1 ) * 0xff | 0
  // ]

  // return makeColor( col, alpha || 1 )
  return makeColor( biome, alpha || 1 )
}

module.exports = function renderable( canvas ) {

  var ctx = canvas.getContext( '2d' )


  return function render( region ) {
    console.log( region )
    var start = performance.now()
    console.log( 'rendering' )

    var diagram = region.diagram



    // Render cells
    for ( let i = 0; i < diagram.cells.length; i++ ) {
    // for ( let i = 50; i < 51; i++ ) {
      let cell = diagram.cells[ i ]
      let halfedges = cell.halfedges
      let point = halfedges[ 0 ].getEndpoint()
      ctx.beginPath()
      ctx.moveTo( point.x, point.y )
      for ( let j = 0; j < halfedges.length; j++ ) {
        let point = halfedges[ j ].getEndpoint()
        ctx.lineTo( point.x, point.y )

        // Render the vertex point
        // ctx.fillStyle = color( noise.getEase( region.origin[ 0 ] + cell.site.x, region.origin[ 1 ] + cell.site.y ) )
        // ctx.fillRect( point.x - 2, point.y - 2, 5, 5 )
      }

      ctx.lineTo( point.x, point.y )

      // let col = makeColor( [ i * 2, i * 2, i * 2 ], 1 )
      let col = color( noise.get( cell.site.x, cell.site.y ), 1 )

      ctx.fillStyle = col
      ctx.fill()
      ctx.strokeStyle = col
      ctx.stroke()

    }

    // Render vertices
    // ctx.fillStyle = 'rgb( 0, 0, 255 )'
    // for ( let i = 0; i < diagram.vertices.length; i++ ) {
    //   let vertex = diagram.vertices[ i ]
    //   ctx.fillRect( vertex.x - 1, vertex.y - 1, 3, 3 )
    // }

    // Render edges
    // for ( let i = 0; i < diagram.edges.length; i++ ) {
    //   let edge = diagram.edges[ i ]
    //   ctx.beginPath()
    //   ctx.moveTo( edge.va.x, edge.va.y )
    //   ctx.lineTo( edge.vb.x, edge.vb.y )
    //   ctx.strokeStyle = 'rgb( 230, 230, 242 )'
    //   ctx.stroke()
    // }

    // Render initial seed sites
    // ctx.fillStyle = 'rgb( 255, 0, 0 )'
    // for ( let i = 0; i < diagram.cells.length; i++ ) {
    //   let site = diagram.cells[ i ].site
    //   ctx.fillRect( site.x - 1, site.y - 1, 3, 3 )
    // }

    console.log( 'rendering done', performance.now() - start )
  }
}
