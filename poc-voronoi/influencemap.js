
'use strict';

var clamp = require( 'mathutil' ).clamp
var varying = require( './options' )

/**
 * Provides a shelf drop-off, influence lights are either on (say .5 to 1) or off,
 * lights at .2 and .3 arent much help
 */
function getInfluence( x, y ) {
  // let pow = influenceNoise.get( x, y )
  let pow = varying.heightmap.get( x, y )
  if ( pow < varying.influenceDropoff ) {
    return 0
  }
  return pow * varying.influenceMultiplier
}

var bounds = [ 0, 0, 1, 1 ]

/**
 * Helpers
 */
function isCorner( x, y ) {
  return (  ( x === bounds[ 0 ] && y === bounds[ 1 ] ) ||    // tl
            ( x === bounds[ 2 ] && y === bounds[ 1 ] ) ||    // tr
            ( x === bounds[ 0 ] && y === bounds[ 3 ] ) ||    // bl
            ( x === bounds[ 2 ] && y === bounds[ 3 ] ) )   // br
}

function isHorizontalEdge( x, y ) {
  return ( y === bounds[ 1 ] || y === bounds[ 3 ] )
}

function isVerticalEdge( x, y ) {
  return ( x === bounds[ 0 ] || x === bounds[ 2 ] )
}


/**
 * Generates a seed map using only internal points
 * Edge vertices will have to be smoothed post-voronoi to match up with
 * adjacent regions
 *
 * Influence:
 *   origin: <[ x, y ]> clamped 0...1
 *   pow: <p> clamped 0...1
 */
class InfluenceMap {
  constructor( region, divisions ) {
    this.bounds = region.bounds
    this.dimensions = region.dimensions
    this.divisions = divisions
  }

  generate() {
    let influences = []

    for ( let y = 0; y <= 1; y += 1 / this.divisions ) {
      for ( let x = 0; x <= 1; x += 1 / this.divisions ) {
        let influence = this.generateInfluence( x, y )
        if ( influence ) {
          influences.push( influence )
        }
      }
    }

    return influences
  }

  generateInfluence( x, y ) {
    let d = [
      this.bounds[ 0 ] + x * this.dimensions[ 0 ],
      this.bounds[ 1 ] + y * this.dimensions[ 1 ]
    ]

    let p = [
      x + varying.perturbmap.get( d[ 0 ], d[ 1 ] ) * varying.influenceRelaxation,
      y + varying.perturbmap.get( -d[ 0 ], -d[ 1 ] ) * varying.influenceRelaxation
    ]

    let power = clamp( getInfluence( d[ 0 ], d[ 1 ] ), 0, 1 )

    // If corner then just push
    if ( isCorner( x, y ) ) {
      return {
        origin: [ x, y ],
        pow: power
      }
    }

    // Perturb horizontal edge vertices along x
    if ( isHorizontalEdge( x, y ) ) {
      return {
        origin: [ p[ 0 ], y ],
        pow: power
      }
    }

    // Perturb vertical edge vertices along y
    if ( isVerticalEdge( x, y ) ) {
      return {
        origin: [ x, p[ 1 ] ],
        pow: power
      }
    }

    // If we got here then this is central vertex so perturb away
    // Central points should have less influence as they cover more points
    return {
      origin: [ p[ 0 ], p[ 1 ] ],
      pow: power * .5
    }
  }
}


module.exports = InfluenceMap
