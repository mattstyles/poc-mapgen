
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
  voronoi() {
    return voronoi.compute( this.sites, {
      xl: this.origin[ 0 ],
      xr: this.origin[ 0 ] + this.dimensions[ 0 ],
      yt: this.origin[ 1 ],
      yb: this.origin[ 1 ] + this.dimensions[ 1 ]
    })
  }
}

module.exports = Region
