
'use strict';

var ndarray = require( 'ndarray' )
var C = require( './constants' )
var Region = require( './region' )

class World {
  constructor() {
    this.regions = ndarray( new Array( 2 * 2 ), [ 2, 2 ] )
  }

  generate( x, y ) {
    let region = new Region({
      x: x * C.WORLD_SIZE[ 0 ],
      y: y * C.WORLD_SIZE[ 1 ],
      width: C.WORLD_SIZE[ 0 ],
      height: C.WORLD_SIZE[ 1 ],
      divisions: C.DIVISIONS
    })

    // Smooth each edge
    let left = this.regions.get( x - 1, y )
    if ( left && x > 0 ) {
      region.smoothVertices( 'left', left )
    }
    let right = this.regions.get( x + 1, y )
    if ( right && x < this.regions.shape[ 0 ] - 1 ) {
      region.smoothVertices( 'right', right )
    }
    let top = this.regions.get( x, y - 1 )
    if ( top && y > 0 ) {
      region.smoothVertices( 'top', top )
    }
    let bottom = this.regions.get( x, y + 1 )
    if ( bottom && y < this.regions.shape[ 1 ] - 1 ) {
      region.smoothVertices( 'bottom', bottom )
    }

    this.regions.set( x, y, region )
  }
}

module.exports = World
