
'use strict';

var ndarray = require( 'ndarray' )
var C = require( './constants' )
var Region = require( './region' )

var varying = require( './options' )

class World {
  constructor() {
    this.regions = ndarray( new Array( 2 * 2 ), [ 2, 2 ] )
  }

  generate( x, y ) {
    // @TODO check memory
    if ( this.regions.get( 0, 0 ) ) {
      delete this.regions.get( 0, 0 )
    }

    let region = new Region({
      x: x * varying.worldSize,
      y: y * varying.worldSize,
      width: varying.worldSize,
      height: varying.worldSize,
      divisions: varying.siteDivisor
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
