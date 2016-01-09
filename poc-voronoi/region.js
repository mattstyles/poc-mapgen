
'use strict';

/**
 * Regions define a large chunk and have their own voronoi generator.
 * This means point in region checks can be quicker.
 * Regions hold a collection of voronoi cells/biomes/chunks.
 */

var ndarray = require( 'ndarray' )
var Voronoi = require( './voronoi' )
var Seedmap = require( './seedmap' )
var InfluenceMap = require( './influencemap' )
// var Quadtree = require( './quadtree' )
var C = require( './constants' )
var renderToTexture = require( './renderTexture' )
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

    // Kill zero length edges, they appear sometimes and make
    // pointIntersection fail so fix it here
    // @TODO nuts, at this stage there are no errors? so its the edge smoothing causing issues
    // No need to do this if we dont smooth the edges vertices
    // @TODO if we dont smooth edges we need a better way of specifying the points
    // that generate the diagram so that the edges match up
    // diagram.cells = diagram.cells.map( cell => {
    //   cell.halfedges.forEach( ( edge, index ) => {
    //     let start = edge.getStartpoint()
    //     let end = edge.getEndpoint()
    //     console.log( 'halfedge', start, end )
    //     if ( ( start.x === end.x ) && ( start.y === end.y ) ) {
    //       console.error( '0 length edge' )
    //       cell.halfedges.splice( index, index + 1 )
    //     }
    //   })
    //   return cell
    // })

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
   * Generates a quadtree from the cell map
   * Use bounding box to store cells, then, when retrieving grab all cells associated
   * with a point and run pointIntersection against just those cells (cells bboxes
   * will overlap each other)
   */
  generateQuadtree() {
    return new Quadtree( this )
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

      // let value = 1.0 - cell.elevation
      let value = varying.temperaturemap.get( cell.site.x, cell.site.y )
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
    // this.sites = this.generateSeedMap()
    // console.log( '  seed map generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color:' + col )
    // start = performance.now()
    // this.influences = this.generateInfluenceMap()
    // console.log( '  influence map generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color:' + col )
    // start = performance.now()
    // this.diagram = this.generateVoronoi()
    // console.log( '  voronoi diagram generation time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )

    // Dont bother with quadtrees, creating the texture by performing pointIntersection
    // against every cell, which sounds stupid but seems to be quicker than jumping
    // through quadtree pointers
    // start = performance.now()
    // this.celltree = this.generateQuadtree()
    // console.log( '  voronoi partitioning time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )


    // All these applications run over the entire cell array each time, meaning they
    // can probably be done all at once with just one iteration. Check perf.

    col = 'rgb( 235, 137, 49 )'

    // start = performance.now()
    // this.applyElevationMap( this.diagram, varying.heightmap, this.influences )
    // console.log( '  elevation map application time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )
    //
    // start = performance.now()
    // this.applyMoistureMap( this.diagram, varying.moisturemap )
    // console.log( '  moisture map application time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )
    //
    // start = performance.now()
    // this.applyTemperatureMap( this.diagram, varying.heightmap )
    // console.log( '  temperature map application time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )
    //
    // start = performance.now()
    // this.applyBiomeMap( this.diagram )
    // console.log( '  biome map application time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )


    col = 'rgb( 68, 137, 26 )'
    start = performance.now()
    this.createTexture()
    console.log( '  pixel map construction time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: ' + col )


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
    // @TODO smoothing vertices causes problems for pointIntersection tests
    return

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
   * @TODO this can not be relied upon, there is an issue with the pointIntersection
   * code which means that some cell edges get the same start and end point.
   * This could be fixed but rendering to a texture is probably more reliable.
   * @returns <Cell || null>
   */
  getCell( x, y ) {
    // console.log( 'region:getCell', x, y )
    // var start = performance.now()

    if ( this.texture ) {
      return this.texture.get( x, y )
    }

    // @TODO this should not be done here, should be done when
    // @TODO see note in generateVoronoi
    // var cells = this.diagram.cells.map( cell => {
    //   cell.halfedges.forEach( ( he, index ) => {
    //     let start = he.getStartpoint()
    //     let end = he.getEndpoint()
    //     if ( ( start.x === end.x ) && ( start.y === end.y ) ) {
    //       console.error( '0 length edge' )
    //       cell.halfedges.splice( index, index + 1 )
    //     }
    //   })
    //   return cell
    // })
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
    // console.warn( 'here goes, could take a bit of time' )
    // var start = performance.now()

    let texture = ndarray([ this.dimensions[ 0 ] * this.dimensions[ 1 ] ], [
      this.dimensions[ 0 ],
      this.dimensions[ 1 ]
    ])

    // var applyInfluence = function( value, point ) {
    //   // Normalize x,y to 0...1
    //   let unit = [
    //     ( point[ 0 ] - this.origin[ 0 ] ) / this.dimensions[ 0 ],
    //     ( point[ 1 ] - this.origin[ 1 ] ) / this.dimensions[ 1 ]
    //   ]
    //
    //   // Clamp gradient to 0 to stop negative numbers from being applied to the average
    //   let influences = this.influences.map( inf => {
    //     // return gradient( inf.origin, inf.pow, unit )
    //     return clamp( gradient( inf.origin, inf.pow, unit ), 0, 1 )
    //   })
    //   // average influences and clamp
    //   let influence = clamp( influences.reduce( ( prev, curr ) => prev + curr ), 0, 1 )
    //
    //   value *= influence
    //   return value
    // }.bind( this )

    var point
    for ( var y = 0; y < this.dimensions[ 0 ]; y++ ) {
      for ( var x = 0; x < this.dimensions[ 1 ]; x++ ) {
        // Add per-pixel heightmap data, pretty slow
        // let cell = this.getCell( x, y )
        point = [ x + this.bounds[ 0 ], y + this.bounds[ 1 ] ]
        texture.set( x, y, {
          // biome: cell.biome,
          // elevation: applyInfluence( varying.heightmap.get( x, y ), [ x, y ] ),
          elevation: varying.heightmap.get( point[ 0 ], point[ 1 ] ),
          moisture: varying.moisturemap.get( point[ 0 ], point[ 1 ] ),
          temperature: varying.temperaturemap.get( point[ 0 ], point[ 1 ] )
        })
      }
    }
    // console.log( 'iteration time: %c' + ( performance.now() - start ).toFixed( 2 ), 'color: rgb( 224, 111, 139 )' )

    this.texture = texture
    return texture
  }

  /**
   * Renders to a canvas texture and grabs the pixel data.
   * Relies on a DOM so other methods will be required when we dont have one.
   */
  renderToTexture() {
    return renderToTexture( this )
  }
}

module.exports = Region
