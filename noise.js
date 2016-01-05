
'use strict';

/**
 * PRNG for noise generation. Primarily used to determine cell shading.
 */

var qs = require( 'qs' )
var query = qs.parse( window.location.search.replace( /^\?/, '' ) )

var SimplexNoise = require( 'fast-simplex-noise' )
var Bezier = require( 'bezier-easing' )
var PRNG = require( 'seedrandom' )

var seed = query.seed || require( './package.json' ).name
var random = new PRNG( seed )

// var bezier = new Bezier( .75, 1, .85, 1 )
// var bezier = new Bezier( .8, 0, .7, 1 )

// var noise = new SimplexNoise({
//   min: 0,
//   max: 1,
//   octaves: 4,
//   persistence: 1 / Math.pow( 2, 3 ),
//   frequency: 1 / Math.pow( 2, 10 ),
//   amplitude: 1,
//   random: random
// })

module.exports = class Noise {
  constructor( noiseOptions ) {
    let opts = Object.assign({
      min: 0,
      max: 1,
      octaves: 4,
      persistence: 1 / Math.pow( 2, 3 ),
      frequency: 1 / Math.pow( 2, 10 ),
      amplitude: 1,
      random: random
    }, noiseOptions )

    this.noise = new SimplexNoise( opts )
    this.bezier = new Bezier( .8, 0, .7, 1 )
  }

  get( x, y ) {
    return this.noise.get2DNoise( x, y )
  }
  
  getEase( x, y ) {
    return this.bezier.get( this.noise.get2DNoise( x, y ) )
  }
}
