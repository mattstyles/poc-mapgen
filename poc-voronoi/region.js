
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
var biomes = require( './biomes' )

var voronoi = new Voronoi()

var varying = require( './options' )

var Bezier = require( 'bezier-easing' )
var easeOutQuad = new Bezier( .55, 1, .55, 1 )
var easeInQuad = new Bezier( .75, .3, .8, .8 )
var easeInOutQuad = new Bezier( .8, 0, .7, 1 )
var easeInOut = new Bezier( .4, 0, .6, 1 )

/**
 * Checks if origin is close enough to target, given a variance
 */
function close( origin, target, variance ) {
  variance = variance || 5
  return ( origin < target + variance ) && ( origin > target - variance )
}

/**
 * Basic euclidean distance between points
 */
function dist( p0, p1 ) {
  return Math.sqrt( Math.pow( p0[ 0 ] - p1[ 0 ], 2 ) + Math.pow( p0[ 1 ] - p1[ 1 ], 2 ) )
}

/**
 * Get inclusion within a graduated circle
 */
function gradient( origin, radius, target ) {
  // let distance = clamp( dist( origin, target ), 0, 1 )
  // return clamp( 1.0 - distance / radius, 0, 1 )
  return 1.0 - dist( origin, target ) / radius
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
  generateInfluenceMap() {
    let influenceMap = new InfluenceMap( this, varying.influenceDivisor )
    return influenceMap.generate()
  }

  /**
   * Applies elevation data to a voronoi diagram
   * using an underlying heightmap and influencemap.
   * Mutates diagram.
   */
  applyElevationMap( diagram, heightmap, influencemap ) {
    for ( let i = 0; i < diagram.cells.length; i++ ) {
      let cell = diagram.cells[ i ]

      // Grab base elevation level from heightmap
      let value = heightmap.get( cell.site.x, cell.site.y )

      // Add perturb ridges
      // value *= Math.abs( .5 + varying.random.get( cell.site.x, cell.site.y ) * .5 )

      // Use circular gradients to calculate influence regions
      // Sums all of the influences into 0...1 and modifies value
      if ( influencemap ) {
        // Normalize x,y to 0...1
        let unit = [
          ( cell.site.x - this.origin[ 0 ] ) / this.dimensions[ 0 ],
          ( cell.site.y - this.origin[ 1 ] ) / this.dimensions[ 1 ]
        ]

        // Clamp gradient to 0 to stop negative numbers from being applied to the average
        let influences = influencemap.map( inf => {
          // return gradient( inf.origin, inf.pow, unit )
          return clamp( gradient( inf.origin, inf.pow, unit ), 0, 1 )
        })
        // average influences and clamp
        let influence = clamp( influences.reduce( ( prev, curr ) => prev + curr ), 0, 1 )

        value *= influence
      }

      cell.elevation = value
    }
  }

  /**
   * Applies the moisture map to the cell data
   */
  applyMoistureMap( diagram, moisturemap ) {
    for ( let i = 0; i < diagram.cells.length; i++ ) {
      let cell = diagram.cells[ i ]

      // For now just use noise, but should probably gather data about neighbours,
      // the influencemap clamps elevation to 0 for ocean/water tiles.
      // @TODO there should be no clamping, at the moment there is a dropoff, but
      // water tiles should still have an elevation, it'll just be under the waterline
      cell.moisture = moisturemap.get( cell.site.x, cell.site.y )
    }
  }

  /**
   * Applies a temperature map to the cell data
   * @TODO currently expects elevation data as it is just the inverse of elevation
   * with a little noise applied
   */
  applyTemperatureMap( diagram, tempmap ) {
    for ( let i = 0; i < diagram.cells.length; i++ ) {
      let cell = diagram.cells[ i ]

      // For now we'll just use elevation to guide temperature, but add a little noise
      // let value = tempmap.get( cell.site.x, cell.site.y )
      // value = clamp( value * varying.jitter.get( cell.site.x, cell.site.y ), 0, 1 )
      // cell.temperature = 1.0 - value

      let value = 1.0 - cell.elevation
      value = clamp( value * ( .9 + varying.jitter.get( cell.site.x, cell.site.y ) * .15 ), 0, 1 )
      cell.temperature = value
    }
  }

  /**
   * Applies the biome map from elevation, temperature and moisture data
   * Expects all values to exist in cell data
   */
  applyBiomeMap( diagram ) {
    for ( let i = 0; i < diagram.cells.length; i++ ) {
      let cell = diagram.cells[ i ]

      cell.biome = biomes.get( cell.moisture, cell.temperature )

      // Crank out water/ocean tiles - this effectively sets the water line
      // @TODO this shouldnt just override here
      if ( cell.elevation < .1 ) {
        cell.biome = C.BIOMES.OCEAN
      }
    }
  }

  /**
   * Master generate function
   */
  generate() {
    let col = 'rgb( 224, 111, 139 )'
    console.log( '> generating region %c<' + this.origin[ 0 ] + ',' + this.origin[ 1 ] + '>', 'color:' + col )
    var totalstart = performance.now()

    col = 'rgb( 49, 162, 242 )'
    var start = performance.now()
    this.sites = this.generateSeedMap()
    console.log( '  seed map generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color:' + col )
    start = performance.now()
    this.influences = this.generateInfluenceMap()
    console.log( '  influence map generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color:' + col )
    start = performance.now()
    this.diagram = this.generateVoronoi()
    console.log( '  voronoi diagram generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )

    // Apply heightmap - could be generated somehow here, using noise functions
    // is probably still better though
    // Ease the basic noisy heightmap for better distribution of landmass
    // @TODO probably should not mutate the underlying heigthmap from the options,
    // if the heightmap needs easing then do so in the options heightmap. Other sources,
    // such as individual pixel elevation, should draw from the same place so that
    // biome elevation becomes a rough indicator of average pixel/tile height.
    this.heightmap = {
      get: function( point ) {
        let value = varying.heightmap.get( point[ 0 ], point[ 1 ] )
        // @TODO should we ease again here? when we get to individual pixel elevation
        // it would probably make sense to use the heightmap supplied by the options
        // return easeInOut.get( value )
        return value
      }
    }

    // @TODO
    // Generate a moisture map, and any other stuff needed before calculating biome distribution
    // Calc biomes. Biome shape is held in the voronoi diagram.
    // Use colouration code in the render stuff to generate a base value for each cell/biome,
    // currently that'll be a heightmap for elevation, so then the fun can begin of
    // using the voronoi diagram to distribute moisture, or temperature, or flood-fill
    // basins, smooth edges etc etc.

    // All these applications run over the entire cell array each time, meaning they
    // can probably be done all at once with just one iteration. Check perf.

    col = 'rgb( 235, 137, 49 )'

    start = performance.now()
    this.applyElevationMap( this.diagram, varying.heightmap, this.influences )
    console.log( '  elevation map application time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )

    start = performance.now()
    this.applyMoistureMap( this.diagram, varying.moisturemap )
    console.log( '  moisture map application time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )

    start = performance.now()
    this.applyTemperatureMap( this.diagram, varying.heightmap )
    console.log( '  temperature map application time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )

    start = performance.now()
    this.applyBiomeMap( this.diagram )
    console.log( '  biome map application time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )


    col = 'rgb( 224, 111, 139 )'
    console.log( '< region generation time: %c' + ( performance.now() - totalstart ).toFixed( 2 ), 'color: ' + col )
    console.log( '' )
  }

  /**
   * Calculates the border edges, vertices and cells
   */
  calculateBorders( diagram ) {
    function addCellBorder( cell, edge ) {
      // return Object.assign( cell, {
      //   isBorder: edge
      // })
      cell.isBorder = edge
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

  /**
   * Iterates over every cell to find the cell that contains the point
   * @TODO what happens when a point is on the edge of a cell? For now just
   * return the first edge cell encountered
   * @returns <Cell || null>
   */
  getCell( x, y ) {
    // var start = performance.now()
    var cells = this.diagram.cells
    var target = null
    var i = 0
    while( !target && i < cells.length ) {
      if ( cells[ i ].pointIntersection( x, y ) >= 0 ) {
        target = cells[ i ]
      }
      i++
    }
    // console.log( 'target found: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: rgb( 224, 111, 139 )' )
    return target
  }


  /**
   * @TODO
   * need to work out a performant way of doing this
   * per-pixel needs to grab the biome that a pixel refers to, this requires
   * searching through all cells for each pixel. yuck. there must be a better way.
   *
   * macbook air, region size 512, chunk size 16, ~8 seconds
   * but 512 is pretty big for a region, they can almost certainly be done smaller
   * and stitched together afterwards and they should be done is spawned processes
   * to keep the main thread clear anyway. This rough test is pre-optimisation.
   *
   * This is a slow way though, encoding various bits of cell data into a texture
   * and then reading the pixel data would probably be quicker, using canvas
   * requires a DOM though which could be problematic.
   */
  createTexture() {
    console.warn( 'here goes, could take a bit of time' )
    var start = performance.now()
    for ( var y = this.bounds[ 1 ]; y < this.bounds[ 3 ]; y++ ) {
      for ( var x = this.bounds[ 0 ]; x < this.bounds[ 2 ]; x++ ) {
        this.getCell( x, y )
      }
    }
    console.log( 'iteration time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: rgb( 224, 111, 139 )' )
  }
}

module.exports = Region
