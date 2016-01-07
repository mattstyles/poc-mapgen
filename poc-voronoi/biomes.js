
'use strict';

/**
 * Holds biome distribution maps
 * Returns the biome type given a set of parameters, lets start with
 * just temperature and moisture to give an adapted whittaker diagram
 */

var ndarray = require( 'ndarray' )
var C = require( './constants' )

// 2d table measuring moisture(6) against temperature(4)
const biomesDistribution = ndarray([ 6 * 4 ], [ 6, 4 ])

function set( p0, p1, value ) {
  for ( let y = p0[ 1 ]; y <= p1[ 1 ]; y++ ) {
    for ( let x = p0[ 0 ]; x <= p1[ 0 ]; x++ ) {
      biomesDistribution.set( x, y, value )
    }
  }
}

set( [ 0, 0 ], [ 2, 0 ], C.BIOMES.SNOW )
set( [ 3, 0 ], [ 5, 0 ], C.BIOMES.TUNDRA )
set( [ 5, 0 ], [ 5, 0 ], C.BIOMES.SCORCHED )

set( [ 0, 1 ], [ 1, 1 ], C.BIOMES.TAIGA )
set( [ 2, 1 ], [ 3, 1 ], C.BIOMES.SHRUBLAND )
set( [ 4, 1 ], [ 5, 1 ], C.BIOMES.TEMPERATE_DESERT )

set( [ 0, 2 ], [ 0, 2 ], C.BIOMES.TEMPERATE_RAINFOREST )
set( [ 1, 2 ], [ 2, 2 ], C.BIOMES.TEMPERATE_FOREST )
set( [ 3, 2 ], [ 4, 2 ], C.BIOMES.GRASSLAND )
set( [ 5, 2 ], [ 5, 2 ], C.BIOMES.TEMPERATE_DESERT )

set( [ 0, 3 ], [ 1, 3 ], C.BIOMES.TROPICAL_RAINFOREST )
set( [ 2, 3 ], [ 3, 3 ], C.BIOMES.TROPICAL_FOREST )
set( [ 4, 3 ], [ 4, 3 ], C.BIOMES.PLAINS )
set( [ 5, 3 ], [ 5, 3 ], C.BIOMES.DESERT )


class Biomes {
  constructor() {
    this.distribution = biomesDistribution
  }

  log() {
    for ( let y = 0; y < biomes.shape[ 1 ]; y++ ) {
      var row = []
      for ( let x = 0; x < biomes.shape[ 0 ]; x++ ) {
        row.push( biomes.get( x, y ) )
      }
      console.log( row.join( ' ' ) )
    }
  }
}

module.exports = new Biomes()
