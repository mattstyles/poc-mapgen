
'use strict';

/**
 * Regions define a large chunk and have their own voronoi generator.
 * This means point in region checks can be quicker.
 * Regions hold a collection of voronoi cells/biomes/chunks.
 */

var Voronoi = require( './voronoi' )
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

    let bounds = [
      this.origin[ 0 ],
      this.origin[ 1 ],
      this.origin[ 0 ] + this.dimensions[ 0 ],
      this.origin[ 1 ] + this.dimensions[ 1 ]
    ]

    let sites = []

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

    function pushSite( x, y ) {
      let variance = [
        chunkSize[ 0 ] * perturbNoise.get( x, y ),
        chunkSize[ 1 ] * perturbNoise.get( -x, -y )
      ]

      // If corner then just push
      if ( isCorner( x, y ) ) {
        sites.push({
          x: x,
          y: y
        })
        return
      }

      // Perturb horizontal edge vertices along x
      if ( isHorizontalEdge( x, y ) ) {
        sites.push({
          x: x + variance[ 0 ],
          y: y
        })
        return
      }

      // Perturb vertical edge vertices along y
      if ( isVerticalEdge( x, y ) ) {
        sites.push({
          x: x,
          y: y + variance[ 1 ]
        })
        return
      }

      // Perturb central vertices along x and y
      sites.push({
        x: x + variance[ 0 ],
        y: y + variance[ 1 ]
      })
    }

    for ( let y = bounds[ 1 ]; y <= bounds[ 3 ]; y += chunkSize[ 1 ] ) {
      for ( let x = bounds[ 0 ]; x <= bounds[ 2 ]; x += chunkSize[ 0 ] ) {
        pushSite( x, y )
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
