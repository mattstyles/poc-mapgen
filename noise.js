
'use strict';

/**
 * PRNG for noise generation. Primarily used to determine cell shading.
 */

var qs = require( 'qs' )
var query = qs.parse( window.location.search.replace( /^\?/, '' ) )

var Noise = require( 'fast-simplex-noise' )
var Bezier = require( 'bezier-easing' )
var PRNG = require( 'seedrandom' )

var seed = query.seed || require( './package.json' ).name
var random = new PRNG( seed )

// var bezier = new Bezier( .75, 1, .85, 1 )
var bezier = new Bezier( .8, 0, .7, 1 )

var noise = new Noise({
  min: 0,
  max: 1,
  octaves: 4,
  persistence: 1 / Math.pow( 2, 3 ),
  frequency: 1 / Math.pow( 2, 10 ),
  amplitude: 1,
  random: random
})

module.exports = {
  get: function( x, y ) {
    return noise.get2DNoise( x, y )
  },
  getEase: function( x, y ) {
    return bezier.get( noise.get2DNoise( x, y ) )
  }
}
