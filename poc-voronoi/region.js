
'use strict';

/**
 * Regions define a large chunk and have their own voronoi generator.
 * This means point in region checks can be quicker.
 * Regions hold a collection of voronoi cells/biomes/chunks.
 */

var Voronoi = require( './voronoi' )
var Seedmap = require( './seedmap' )
var clamp = require( 'mathutil' ).clamp
var Noise = require( './noise' )

var perturbNoise = new Noise({
  min: -.75,
  max: .75,
  amplitude: .05,
  frequency: .075,
  octaves: 8,
  persistence: .4
})

var rangeNoise = new Noise({
  min: 0,
  max: 1,
  amplitude: 1,
  frequency: .05,
  octaves: 4,
  persistence: .05
})

var voronoi = new Voronoi()


class Region {
  constructor( options ) {
    var opts = Object.assign({
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      divisions: 4
    }, options )

    // Marks the tl corner
    this.origin = [ opts.x, opts.y ]

    this.dimensions = [ opts.width, opts.height ]
    this.divisions = opts.divisions

    this.sites = this.generateSeedMap()

    var start = performance.now()
    console.log( 'generating voronoi' )
    this.diagram = this.generateVoronoi()
    console.log( 'voronoi done', performance.now() - start )
  }

  /**
   * Simple grid perturbation
   */
  generateSeedMap() {
    let seedmap = new Seedmap({
      origin: this.origin,
      dimensions: this.dimensions,
      divisions: this.divisions
    })

    return seedmap.generate()
  }


  /**
   * Returns the voronoi computation
   */
  generateVoronoi() {
    return voronoi.compute( this.sites, {
      xl: this.origin[ 0 ],
      xr: this.origin[ 0 ] + this.dimensions[ 0 ],
      yt: this.origin[ 1 ],
      yb: this.origin[ 1 ] + this.dimensions[ 1 ]
    })
  }

  /**
   * Returns a strip of edge vertices
   */
  getEdgeVertices( edge ) {
    var bounds = [
      this.origin[ 0 ],
      this.origin[ 1 ],
      this.origin[ 0 ] + this.dimensions[ 0 ],
      this.origin[ 1 ] + this.dimensions[ 1 ]
    ]

    return this.diagram.vertices.filter( function( vertex ) {
      if ( edge === 'left' ) {
        return vertex.x === bounds[ 0 ]
      }

      if ( edge === 'right' ) {
        return vertex.x === bounds[ 2 ]
      }

      if ( edge === 'top' ) {
        return vertex.y === bounds[ 1 ]
      }

      if ( edge === 'bottom' ) {
        return vertex.y === bounds[ 3 ]
      }

      // If we got here then the edge enum is not good so throw
      throw new Error( 'edge ' + edge + ' not recognised' )
    }.bind( this ) )
  }

  /**
   * Smoothes vertices along an edge
   * Regions do not keep track of their neighbours so this needs to be called
   * by the object keeping track of regions and their locations
   */
  smoothVertices( edge, region ) {

    // The strip to match - this already exists and should be considered immutable
    var matchStrip = null
    // The strip to mutate - it should end up matching up with matchStrip points
    var strip = null

    if ( edge === 'left' ) {
      matchStrip = region.getEdgeVertices( 'right' )
      strip = this.getEdgeVertices( 'left' )
    }

    if ( edge === 'right' ) {
      matchStrip = region.getEdgeVertices( 'left' )
      strip = this.getEdgeVertices( 'right' )
    }

    if ( edge === 'top' ) {
      matchStrip = region.getEdgeVertices( 'bottom' )
      strip = this.getEdgeVertices( 'top' )
    }

    if ( edge === 'bottom' ) {
      matchStrip = region.getEdgeVertices( 'top' )
      strip = this.getEdgeVertices( 'bottom' )
    }

    // Quick sanity check
    if ( !matchStrip || !strip ) {
      throw new Error( 'edge ' + edge + ' not recognised' )
    }

    /**
     * Iterates the strip and finds the closest vertex to the supplied vertex
     */
    function findClosest( vertex, strip ) {
      let target = strip[ 0 ]
      let closest = Number.MAX_SAFE_INTEGER
      strip.forEach( function( v ) {
        // @TODO noop for closest, although a while loop will still be quicker
        if ( closest === 0 ) {
          return
        }

        // Use x or y depending on horizontal or vertical edge
        let distance = ( edge === 'left' || edge === 'right' )
          ? Math.abs( v.y - vertex.y )
          : Math.abs( v.x - vertex.x )

        if ( distance < closest ) {
          target = v
          closest = distance
        }
      })

      return target
    }

    // For each current vertex, find the closest and update
    strip.forEach( function( v ) {
      let target = findClosest( v, matchStrip )
      v.x = target.x
      v.y = target.y
    })

  }
}

module.exports = Region
