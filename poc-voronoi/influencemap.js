
'use strict';

var clamp = require( 'mathutil' ).clamp
var varying = require( './options' )

var Bezier = require( 'bezier-easing' )
var childWeighting = new Bezier( .6, .3, .7, .4 ) // For specifying number of children for influencers

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

const PI2 = Math.PI * 2

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
 *
 * Influencers may also spawn 'tail' or 'child' influencers to break up the
 * circularity of defining them as circles
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

    // @TODO do internal need to be clamped to stay away from edges?
    p[ 0 ] = clamp( p[ 0 ], .15, .85 )
    p[ 1 ] = clamp( p[ 1 ], .15, .85 )

    let power = clamp( getInfluence( wp ), 0, 1 ) * .5

    let sites = []

    // Push master vertex
    let site = {
      origin: p,
      pow: power
    }
    sites.push( site )

    // If the influencer is active then spawn a tail
    if ( power > .1  ) {
      this.spawnChildren( site ).forEach( child => sites.push( child ) )
    }

    return sites
  }

  /**
   * Spawns a child at the edge of the area of influence of the parent
   */
  spawnChild( parent ) {
    // Generate a point near the edge
    let wp = this.getWorldCoords( parent.origin )

    // Clamp to .5...1.25 * parent influence range
    let radius = parent.pow * ( .5 + varying.random.get( wp[ 0 ], wp[ 1 ] ) * .75 )
    let angle = varying.perturbmap.get( wp[ 0 ], wp[ 1 ] ) * PI2

    // Use the random angle to grab a point somewhere around the circumference of
    // the parent area of influence
    let p = [
      parent.origin[ 0 ] + radius * Math.cos( angle ),
      parent.origin[ 1 ] + radius * Math.sin( angle )
    ]

    // Clamp to the interior—too close to edge causes edge distortions which can
    // be hard to resolve later
    p[ 0 ] = clamp( p[ 0 ], .15, .85 )
    p[ 1 ] = clamp( p[ 1 ], .15, .85 )

    // Reduce power to 40-80%
    let power = parent.pow * ( .6 + varying.jitter.get( wp[ 0 ], wp[ 1 ] ) * .2 )

    return {
      origin: p,
      pow: power,
      parent: parent.origin
    }
  }

  /**
   * Spawns a number of children a parent seed point
   */
  spawnChildren( parent ) {
    let wp = this.getWorldCoords( parent.origin )
    // Spawn between 0...3 children, heavily weighted towards 0
    let num = childWeighting.get( varying.jitter.get( wp[ 0 ], wp[ 1 ] ) ) * 4 | 0

    if ( num === 0 ) {
      return []
    }

    console.log( 'spawning influence children', num )
    let children = []

    for ( var i = 0; i < num; i++ ) {
      children.push( this.spawnChild( parent ) )
    }

    return children
  }

  /**
   * Translate from local to world (0...1 to world)
   */
  getWorldCoords( point ) {
    return [
      this.bounds[ 0 ] + point[ 0 ] * this.dimensions[ 0 ],
      this.bounds[ 1 ] + point[ 1 ] * this.dimensions[ 1 ]
    ]
  }

  /**
   * Perturb master influence sites
   */
  getPerturbation( point ) {
    let worldPoint = this.getWorldCoords( point )
    return [
      clamp( point[ 0 ] + varying.perturbmap.get( worldPoint[ 0 ], worldPoint[ 1 ] ) * varying.influenceRelaxation, 0, 1 ),
      clamp( point[ 1 ] + varying.perturbmap.get( -worldPoint[ 0 ], -worldPoint[ 1 ] ) * varying.influenceRelaxation, 0, 1 )
    ]
  }
}


module.exports = InfluenceMap
