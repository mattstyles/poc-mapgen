
'use strict';

var ndarray = require( 'ndarray' )

function mirror( arr ) {
  let output = {}
  arr.forEach( item => output[ item.toUpperCase() ] = item.toLowerCase() )
  return output
}
const BIOMES = mirror([
  'OCEAN',
  'SNOW',
  'TUNDRA',
  'SCORCHED',
  'TAIGA',
  'SHRUBLAND',
  'TEMPERATE_DESERT',
  'TEMPERATE_RAINFOREST',
  'TEMPERATE_FOREST',
  'GRASSLAND',
  'DESERT',
  'TROPICAL_RAINFOREST',
  'PLAINS',
  'TROPICAL_FOREST'
])

// 2d table measuring moisture(6) against temperature(4)
const biomesDistribution = ndarray([ 6 * 4 ], [ 6, 4 ])

function set( p0, p1, value ) {
  for ( let y = p0[ 1 ]; y <= p1[ 1 ]; y++ ) {
    for ( let x = p0[ 0 ]; x <= p1[ 0 ]; x++ ) {
      biomesDistribution.set( x, y, value )
    }
  }
}

set( [ 3, 0 ], [ 5, 0 ], BIOMES.SNOW )
set( [ 1, 0 ], [ 2, 0 ], BIOMES.TUNDRA )
set( [ 0, 0 ], [ 0, 0 ], BIOMES.SCORCHED )

set( [ 4, 1 ], [ 5, 1 ], BIOMES.TAIGA )
set( [ 2, 1 ], [ 3, 1 ], BIOMES.SHRUBLAND )
set( [ 0, 1 ], [ 1, 1 ], BIOMES.TEMPERATE_DESERT )

set( [ 5, 2 ], [ 5, 2 ], BIOMES.TEMPERATE_RAINFOREST )
set( [ 3, 2 ], [ 4, 2 ], BIOMES.TEMPERATE_FOREST )
set( [ 1, 2 ], [ 2, 2 ], BIOMES.GRASSLAND )
set( [ 0, 2 ], [ 0, 2 ], BIOMES.TEMPERATE_DESERT )

set( [ 5, 3 ], [ 5, 3 ], BIOMES.TROPICAL_RAINFOREST )
set( [ 4, 3 ], [ 4, 3 ], BIOMES.TROPICAL_FOREST )
set( [ 2, 3 ], [ 3, 3 ], BIOMES.PLAINS )
set( [ 0, 3 ], [ 1, 3 ], BIOMES.DESERT )


class Biomes {
  constructor() {
    this.distribution = biomesDistribution
  }

  /**
   * Expects temp and moisture as 0...1
   */
  get( moisture, temperature ) {
    return this.distribution.get( moisture * 6 | 0, temperature * 4 | 0 )
  }

  log() {
    for ( let y = 0; y < this.distribution.shape[ 1 ]; y++ ) {
      var row = []
      for ( let x = 0; x < this.distribution.shape[ 0 ]; x++ ) {
        row.push( this.distribution.get( x, y ) )
      }
      console.log( row.join( ' ' ) )
    }
  }
}

module.exports = new Biomes()
