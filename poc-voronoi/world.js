
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
    if ( this.regions.get( x, y ) ) {
      delete this.regions.get( x, y )
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

  getCell( x, y ) {
    let regionPoint = [
      x / varying.worldSize | 0, y / varying.worldSize | 0
    ]
    // console.log( 'retrieving from region', region[ 0 ], region[ 1 ] )
    let region = this.regions.get( regionPoint[ 0 ], regionPoint[ 1 ] )
    return region.getCell( x % region.bounds[ 2 ], y % region.bounds[ 3 ] )
  }
}

module.exports = World
