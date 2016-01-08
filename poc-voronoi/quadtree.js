
'use strict';

/**
 * Divides a list of voronoi cells into a quadtree
 */


/**
 * d3-quadtree is far far slower for the small sets we're dealing with.
 * Might be worth using if we really crank the region size up but it would have
 * to be huge, which would prohibit the rest of the generation
 */
// var Treemap = require( './deps/d3-quadtree' )()

// class Quadtree {
//   constructor( region ) {
//     this.cells = region.diagram.cells
//
//     // Populate treemap
//     this.treemap = new Treemap( this.cells.map( cell => {
//       return {
//         point: [ cell.site.x, cell.site.y ],
//         data: cell
//       }
//     }))
//   }
//
//   get( x, y ) {
//     return this.treemap.find( x, y ).data
//   }
//
//   set( cell ) {
//     this.treemap.add( [ cell.site.x, cell.site.y ], cell )
//   }
// }

require( './deps/quadtree' )
var Treemap = QuadTree

/**
 * This doesnt appear to work correctly, it doesnt index very well, most cells just
 * end up at the root node. Rubbish. Its mega slow anyway for small sets again.
 */
class Quadtree {
  constructor( region ) {
    this.cells = region.diagram.cells

    // Populate treemap
    this.treemap = new Treemap({
      x: region.bounds[ 0 ],
      y: region.bounds[ 1 ],
      width: region.dimensions[ 0 ],
      height: region.dimensions[ 1 ]
    })

    var i = this.cells.length
    while( --i ) {
      this.set( i, this.cells[ i ] )
    }
  }

  get( x, y ) {
    // get cells that overlap the point
    let cells = this.treemap.retrieve({
      x: x,
      y: y
    })
    let i = cells.length
    var cell
    while( --i ) {
      cell = this.cells[ cells[ i ].id ]
      if ( cell.pointIntersection( x, y ) > 0 ) {
        return this.cells[ i ]
      }
    }
  }

  set( id, cell ) {
    let box = cell.getBbox()
    box.id = id
    this.treemap.insert( box )
  }
}

module.exports = Quadtree
