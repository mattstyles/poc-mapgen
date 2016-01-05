
'use strict';

/**
 * Regions define a large chunk and have their own voronoi generator.
 * This means point in region checks can be quicker.
 * Regions hold a collection of voronoi cells/biomes/chunks.
 */

var Voronoi = require( './voronoi' )
var random = require( 'lodash.random' )

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

    this.sites = this.generateSiteMap()
  }

  /**
   * Simple grid perturbation
   */
  generateSiteMap() {
    let chunkSize = [
      this.dimensions[ 0 ] / this.divisions,
      this.dimensions[ 1 ] / this.divisions
    ]

    let sites = []
    for ( let y = this.origin[ 1 ] + ( chunkSize[ 1 ] / 2 ); y <= this.origin[ 1 ] + this.dimensions[ 1 ]; y += chunkSize[ 1 ] ) {
      for ( let x = this.origin[ 0 ] + ( chunkSize[ 0 ] / 2 ); x <= this.origin[ 0 ] + this.dimensions[ 0 ]; x += chunkSize[ 0 ] ) {
        // perturb and push
        let variance = [
          chunkSize[ 0 ] * random( .35, .5 ),
          chunkSize[ 1 ] * random( .35, .5 )
        ]
        sites.push({
          x: x + random( -variance[ 0 ], variance[ 0 ] ),
          y: y + random( -variance[ 1 ], variance[ 1 ] )
        })
      }
    }
    return sites
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
