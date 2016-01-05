
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
   *
   * @TODO currenly regions share edge vertices so that polygons appear to stride
   * region boundaries, but they do not, they are two polygons that share a site
   * so they use the same site seed to generate their colour/biome.
   * Instead, sites should be chosen _inside_ a region and any edge vertices should
   * be smoothed to any pre-existing vertices. i.e. if a region is being generated
   * then let it generate randomly and then match vertices (not sites) with adjacent
   * regions, it will also be necessary to smooth edges or match biome type.
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
   * @TODO smoothes vertices to match edges
   * @TODO currently just smoothes the left edge
   */
  smoothVertices( region ) {
    let matchStrip = region.diagram.vertices.filter( function( vertex ) {
      return vertex.x === this.origin[ 0 ]
    }.bind( this ) )

    let strip = this.diagram.vertices.filter( function( vertex ) {
      return vertex.x === this.origin[ 0 ]
    }.bind( this ) )

    /**
     * Iterates the strip and finds the closest vertex to the supplied vertex
     */
    function findClosest( vertex, strip ) {
      let target = strip[ 0 ]
      let closest = Number.MAX_SAFE_INTEGER
      strip.forEach( function( v ) {
        let distance = Math.abs( v.y - vertex.y )
        if ( distance < closest ) {
          target = v
          closest = distance
        }
        // @TODO bail if distance = 0
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
