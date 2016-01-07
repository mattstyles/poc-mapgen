
'use strict';

/**
 * Regions define a large chunk and have their own voronoi generator.
 * This means point in region checks can be quicker.
 * Regions hold a collection of voronoi cells/biomes/chunks.
 */

var Voronoi = require( './voronoi' )
var Seedmap = require( './seedmap' )
var InfluenceMap = require( './influencemap' )
var C = require( './constants' )
var clamp = require( 'mathutil' ).clamp

var voronoi = new Voronoi()

var varying = require( './options' )

/**
 * Checks if origin is close enough to target, given a variance
 */
function close( origin, target, variance ) {
  variance = variance || 5
  return ( origin < target + variance ) && ( origin > target - variance )
}


/**
 * Region class
 */
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
    this.bounds = [
      this.origin[ 0 ],
      this.origin[ 1 ],
      this.origin[ 0 ] + this.dimensions[ 0 ],
      this.origin[ 1 ] + this.dimensions[ 1 ]
    ]

    // @TODO add more per-region differences (i.e. 4x influencer distribution
    // instead of 3x) and pass through to the generators rather than externally
    // grabbing an options hash
    this.generate()
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
    let diagram = voronoi.compute( this.sites, {
      xl: this.origin[ 0 ],
      xr: this.origin[ 0 ] + this.dimensions[ 0 ],
      yt: this.origin[ 1 ],
      yb: this.origin[ 1 ] + this.dimensions[ 1 ]
    })

    diagram = this.calculateBorders( diagram )

    return diagram
  }

  /**
   * Generates an influence map
   * Influences have a location and a power that determine overall z-height
   * at their locations
   * Influences get modelled like circular additive light sources and are
   * applied to the overall heightmap
   */
  generateInfluenceMap( divisions ) {
    let influenceMap = new InfluenceMap( this, varying.influenceDivisor )
    return influenceMap.generate()
  }

  /**
   * Master generate function
   */
  generate() {
    let col = 'rgb( 49, 162, 242 )'
    console.log( '> generating region %c<' + this.origin[ 0 ] + ',' + this.origin[ 1 ] + '>', 'color:' + col )
    var totalstart = performance.now()
    var start = performance.now()
    this.sites = this.generateSeedMap()
    console.log( '  seed map generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color:' + col )
    start = performance.now()
    this.influences = this.generateInfluenceMap( 3 )
    console.log( '  influence map generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color:' + col )
    start = performance.now()
    this.diagram = this.generateVoronoi()
    console.log( '  voronoi diagram generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )

    console.log( '< region generation time: %c' + ( performance.now() - totalstart ).toFixed( 2 ), 'color: ' + col )
  }

  /**
   * Calculates the border edges, vertices and cells
   */
  calculateBorders( diagram ) {
    function addCellBorder( cell, edge ) {
      return Object.assign( cell, {
        isBorder: edge
      })
    }

    // Calc edges and cells at the same time
    diagram.edges = diagram.edges.map( function( edge ) {
      // left
      if ( close( edge.va.x, this.bounds[ 0 ] ) && close( edge.vb.x, this.bounds[ 0 ] ) ) {
        // Quick check that rSite does not exist for the edge (it wont as its a border)
        if ( !edge.rSite ) {
          let cell = diagram.cells[ edge.lSite.voronoiId ]
          cell = addCellBorder( cell, C.EDGES.LEFT )
        }

        return Object.assign( edge, {
          isBorder: C.EDGES.LEFT
        })
      }
      // right
      if ( close( edge.va.x, this.bounds[ 2 ] ) && close( edge.vb.x, this.bounds[ 2 ] ) ) {
        if ( !edge.rSite ) {
          let cell = diagram.cells[ edge.lSite.voronoiId ]
          cell = addCellBorder( cell, C.EDGES.RIGHT )
        }
        return Object.assign( edge, {
          isBorder: C.EDGES.RIGHT
        })
      }
      // top
      if ( close( edge.va.y, this.bounds[ 1 ] ) && close( edge.vb.y, this.bounds[ 1 ] ) ) {
        if ( !edge.rSite ) {
          let cell = diagram.cells[ edge.lSite.voronoiId ]
          cell = addCellBorder( cell, C.EDGES.TOP )
        }
        return Object.assign( edge, {
          isBorder: C.EDGES.TOP
        })
      }
      // bottom
      if ( close( edge.va.y, this.bounds[ 3 ] ) && close( edge.vb.y, this.bounds[ 3 ] ) ) {
        if ( !edge.rSite ) {
          let cell = diagram.cells[ edge.lSite.voronoiId ]
          cell = addCellBorder( cell, C.EDGES.BOTTOM )
        }
        return Object.assign( edge, {
          isBorder: C.EDGES.BOTTOM
        })
      }

      // Everything else gets null
      return Object.assign( edge, {
        isBorder: false
      })
    }.bind( this ))

    // Calc vertices
    diagram.vertices = diagram.vertices.map( function( vertex ) {
      if ( close( vertex.x, this.bounds[ 0 ] ) ) {
        return Object.assign( vertex, {
          isBorder: C.EDGES.LEFT
        })
      }
      if ( close( vertex.x, this.bounds[ 2 ] ) ) {
        return Object.assign( vertex, {
          isBorder: C.EDGES.RIGHT
        })
      }
      if ( close( vertex.y, this.bounds[ 1 ] ) ) {
        return Object.assign( vertex, {
          isBorder: C.EDGES.TOP
        })
      }
      if ( close( vertex.y, this.bounds[ 3 ] ) ) {
        return Object.assign( vertex, {
          isBorder: C.EDGES.BOTTOM
        })
      }
      return Object.assign( vertex, {
        isBorder: false
      })
    }.bind( this ))

    return diagram
  }

  /**
   * Returns a strip of edge vertices
   */
  getEdgeVertices( edge ) {
    return this.diagram.vertices.filter( vertex => vertex.isBorder === edge )
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

    if ( edge === C.EDGES.LEFT ) {
      matchStrip = region.getEdgeVertices( C.EDGES.RIGHT )
      strip = this.getEdgeVertices( C.EDGES.LEFT )
    }

    if ( edge === C.EDGES.RIGHT ) {
      matchStrip = region.getEdgeVertices( C.EDGES.LEFT )
      strip = this.getEdgeVertices( C.EDGES.RIGHT )
    }

    if ( edge === C.EDGES.TOP ) {
      matchStrip = region.getEdgeVertices( C.EDGES.BOTTOM )
      strip = this.getEdgeVertices( C.EDGES.TOP )
    }

    if ( edge === C.EDGES.BOTTOM ) {
      matchStrip = region.getEdgeVertices( C.EDGES.TOP )
      strip = this.getEdgeVertices( C.EDGES.BOTTOM )
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
        let distance = ( edge === C.EDGES.LEFT || edge === C.EDGES.RIGHT )
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
