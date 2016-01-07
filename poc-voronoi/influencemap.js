
'use strict';

var clamp = require( 'mathutil' ).clamp
var varying = require( './options' )

/**
 * Provides a shelf drop-off, influence lights are either on (say .5 to 1) or off,
 * lights at .2 and .3 arent much help
 */
function getInfluence( p ) {
  let pow = varying.influenceHeightmap.get( p[ 0 ], p[ 1 ] )
  if ( pow < varying.influenceDropoff ) {
    return 0
  }
  return pow * varying.influenceMultiplier
}

var bounds = [ 0, 0, 1, 1 ]

/**
 * Helpers
 */
function isCorner( point ) {
  return (  ( point[ 0 ] === bounds[ 0 ] && point[ 1 ] === bounds[ 1 ] ) ||    // tl
            ( point[ 0 ] === bounds[ 2 ] && point[ 1 ] === bounds[ 1 ] ) ||    // tr
            ( point[ 0 ] === bounds[ 0 ] && point[ 1 ] === bounds[ 3 ] ) ||    // bl
            ( point[ 0 ] === bounds[ 2 ] && point[ 1 ] === bounds[ 3 ] ) )   // br
}

function isHorizontalEdge( point ) {
  return ( point[ 1 ] === bounds[ 1 ] || point[ 1 ] === bounds[ 3 ] )
}

function isVerticalEdge( point ) {
  return ( point[ 0 ] === bounds[ 0 ] || point[ 0 ] === bounds[ 2 ] )
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
        let influence = this.generateInfluence( [ x, y ] )
        if ( influence.length ) {
          influence.forEach( i => influences.push( i ) )
        }
      }
    }

    return influences
  }

  /**
   * Returns an array of influencers for each seed site/point
   */
  generateInfluence( seed ) {
    let worldPoint = this.getWorldCoords( seed )
    let point = this.getPerturbation( seed )
    let power = clamp( getInfluence( worldPoint ), 0, 1 )

    // If corner then just push
    if ( isCorner( seed ) ) {
      return [{
        origin: seed,
        pow: power
      }]
    }

    // Perturb horizontal edge vertices along x
    if ( isHorizontalEdge( seed ) ) {
      return [{
        origin: [ point[ 0 ], seed[ 1 ] ],
        pow: power
      }]
    }

    // Perturb vertical edge vertices along y
    if ( isVerticalEdge( seed ) ) {
      return [{
        origin: [ seed[ 0 ], point[ 1 ] ],
        pow: power
      }]
    }

    // If we got here then this is central vertex so perturb away
    // Central points should have less influence as they cover more points
    return this.generateInternalInfluence( seed )
  }

  /**
   * Internal influencers (i.e. those not at edges/borders) have a chance to
   * spawn other influencers in an effort to break up the circularity that arises
   */
  generateInternalInfluence( seed ) {
    let wp = this.getWorldCoords( seed )
    let p = this.getPerturbation( seed )

    let power = clamp( getInfluence( wp ), 0, 1 ) * .5

    let influences = []

    // Push master vertex
    influences.push({
      origin: p,
      pow: power
    })

    // Occasionally generate a tail
    // @TODO for now just add one more influencer, which will result in some
    // teardrop shaped influencers
    if ( varying.random.get( wp[ 0 ], wp[ 1 ] ) < .85 && power > .1  ) {
      // Generate a point near the edge of the influence
      // innerRadius refers to an exclusion zone within the influence region
      // so that the new point appears _near the edge_
      let innerRadius = power * .5
      let outerRadius = power * .75
      let point = [
        p[ 0 ] + ( ( outerRadius + innerRadius ) * varying.perturbmap.get( wp[ 0 ], wp[ 1 ] ) ),
        p[ 1 ] + ( ( outerRadius + innerRadius ) * varying.perturbmap.get( -wp[ 0 ], -wp[ 1 ] ) )
      ]

      // Clamp them to the interior, too close to the edges and you get edge banding
      point[ 0 ] = clamp( point[ 0 ], .25, .75 )
      point[ 1 ] = clamp( point[ 1 ], .25, .75 )

      // Reduce power to 40-80%
      influences.push({
        origin: point,
        pow: power * ( .6 + varying.jitter.get( wp[ 0 ], wp[ 1 ] ) * .2 ),
        master: p
      })
    }

    return influences
  }

  getWorldCoords( point ) {
    return [
      this.bounds[ 0 ] + point[ 0 ] * this.dimensions[ 0 ],
      this.bounds[ 1 ] + point[ 1 ] * this.dimensions[ 1 ]
    ]
  }

  getPerturbation( point ) {
    let worldPoint = this.getWorldCoords( point )
    return [
      clamp( point[ 0 ] + varying.perturbmap.get( worldPoint[ 0 ], worldPoint[ 1 ] ) * varying.influenceRelaxation, 0, 1 ),
      clamp( point[ 1 ] + varying.perturbmap.get( -worldPoint[ 0 ], -worldPoint[ 1 ] ) * varying.influenceRelaxation, 0, 1 )
    ]
  }
}


module.exports = InfluenceMap
