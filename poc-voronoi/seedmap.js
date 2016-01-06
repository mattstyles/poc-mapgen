
'use strict';


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


/**
 * Helpers
 */
function isCorner( x, y, bounds ) {
  return (  ( x === bounds[ 0 ] && y === bounds[ 1 ] ) ||    // tl
            ( x === bounds[ 2 ] && y === bounds[ 1 ] ) ||    // tr
            ( x === bounds[ 0 ] && y === bounds[ 3 ] ) ||    // bl
            ( x === bounds[ 2 ] && y === bounds[ 3 ] ) )   // br
}

function isHorizontalEdge( x, y, bounds ) {
  return ( y === bounds[ 1 ] || y === bounds[ 3 ] )
}

function isVerticalEdge( x, y, bounds ) {
  return ( x === bounds[ 0 ] || x === bounds[ 2 ] )
}

/**
 * Generates a seed map for the voronoi generator
 * Generates edge points
 */
class Edgemap {
  constructor( options ) {
    this.opts = Object.assign({
      origin: [ 0, 0 ],
      dimensions: [ 100, 100 ],
      divisions: 2
    }, options )

    this.bounds = [
      this.opts.origin[ 0 ],
      this.opts.origin[ 1 ],
      this.opts.origin[ 0 ] + this.opts.dimensions[ 0 ],
      this.opts.origin[ 1 ] + this.opts.dimensions[ 1 ]
    ]

    this.chunkSize = [
      this.opts.dimensions[ 0 ] / this.opts.divisions,
      this.opts.dimensions[ 1 ] / this.opts.divisions
    ]
  }

  generate() {
    let sites = []

    for ( let y = this.bounds[ 1 ]; y <= this.bounds[ 3 ]; y += this.chunkSize[ 1 ] ) {
      for ( let x = this.bounds[ 0 ]; x <= this.bounds[ 2 ]; x += this.chunkSize[ 0 ] ) {
        let site = this.generateSite( x, y )
        if ( site ) {
          sites.push( site )
        }
      }
    }

    return sites
  }

  generateSite( x, y ) {
    let variance = [
      this.chunkSize[ 0 ] * perturbNoise.get( x, y ),
      this.chunkSize[ 1 ] * perturbNoise.get( -x, -y )
    ]

    // If corner then just push
    if ( isCorner( x, y, this.bounds ) ) {
      return {
        x: x,
        y: y
      }
    }

    // Perturb horizontal edge vertices along x
    if ( isHorizontalEdge( x, y, this.bounds ) ) {
      return {
        x: x + variance[ 0 ],
        y: y
      }
    }

    // Perturb vertical edge vertices along y
    if ( isVerticalEdge( x, y, this.bounds ) ) {
      return {
        x: x,
        y: y + variance[ 1 ]
      }
    }

    // Add a small chance that a central vertex will be missing
    // @TODO chance of missing vertices could be linked to a chunk variable
    // or linked to the underlying map noise function so that some biomes
    // become inherently larger than others
    // you have to be careful skipping central ones as the edge vertices
    // will be uniform
    if ( rangeNoise.get( x, y ) < .25 ) {
      console.log( 'skip' )
      return
    }

    // Perturb central vertices along x and y
    return {
      x: x + variance[ 0 ],
      y: y + variance[ 1 ]
    }
  }
}

/**
 * Generates a seed map using only internal points
 * Edge vertices will have to be smoothed post-voronoi to match up with
 * adjacent regions
 */
class Seedmap extends Edgemap {
  constructor( options ) {
    super( options )
  }

  generate() {
    let sites = []

    let halfChunk = [
      this.chunkSize[ 0 ] / 2,
      this.chunkSize[ 1 ] / 2
    ]

    for ( let y = this.bounds[ 1 ] + halfChunk[ 0 ]; y <= this.bounds[ 3 ]; y += this.chunkSize[ 1 ] ) {
      for ( let x = this.bounds[ 0 ] + halfChunk[ 1 ]; x <= this.bounds[ 2 ]; x += this.chunkSize[ 0 ] ) {
        let site = this.generateSite( x, y )
        if ( site ) {
          sites.push( site )
        }
      }
    }

    return sites
  }

  generateSite( x, y ) {
    let variance = [
      this.chunkSize[ 0 ] * perturbNoise.get( x, y ),
      this.chunkSize[ 1 ] * perturbNoise.get( -x, -y )
    ]

    // Skip a few vertices to add variation
    // if ( rangeNoise.get( x, y ) < .25 ) {
    //   return
    // }

    return {
      x: x + variance[ 0 ],
      y: y + variance[ 1 ]
    }
  }
}


module.exports = Seedmap
