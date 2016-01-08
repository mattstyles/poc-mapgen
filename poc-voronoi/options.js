
'use strict';

var Noise = require( './noise' )
var Bezier = require( 'bezier-easing' )
var PRNG = require( 'seedrandom' )

var easeOutQuad = new Bezier( .55, 1, .55, 1 )
var easeInQuad = new Bezier( .75, .3, .8, .8 )
var easeInOutQuad = new Bezier( .8, 0, .7, 1 )
var easeInOut = new Bezier( .4, 0, .6, 1 )

var qs = require( 'qs' )
var query = qs.parse( window.location.search.replace( /^\?/, '' ) )


var seed = query.seed || require( './package.json' ).name


// @TODO pretty sure there are quicker ways to implement these functions, they
// dont appear to be very fast
var heightmapFn = {
  noise: new Noise({
    min: 0,
    max: 1,
    octaves: 4,
    persistence: 1 / Math.pow( 2, 2 ),
    frequency: 1 / Math.pow( 2, 8 ),
    amplitude: 1,
    random: new PRNG( seed )
  }),
  gens: [
    {
      fn: function( x, y ) {
        return easeInOut.get( this.noise.get( x, y ) )
      },
      weight: .85
    },
    {
      fn: function( x, y ) {
        return randomNoise.get( x, y )
      },
      weight: .15
    }
  ],
  get: function( x, y ) {
    return this.gens.reduce( ( prev, curr ) => {
      return prev + ( curr.fn.call( this, x, y ) * curr.weight )
    }, 0 )
  }
}

/**
 * should match heightmap frequency so they are linked
 */
var influenceFn = {
  noise: new Noise({
    persistence: 1 / Math.pow( 2, 9 ),
    frequency: 1 / Math.pow( 2, 8 ),
    octaves: 2,
    random: new PRNG( seed )
  }),
  gens: [
    {
      fn: function( x, y ) {
        return easeInOutQuad.get( this.noise.get( x, y ) )
      },
      weight: .85
    },
    {
      fn: function( x, y ) {
        return randomNoise.get( x, y )
      },
      weight: .15
    }
  ],
  get: function( x, y ) {
    return this.gens.reduce( ( prev, curr ) => {
      return prev + ( curr.fn.call( this, x, y ) * curr.weight )
    }, 0 )
  }
}

/**
 * Should be the same noise attributes (particularly frequency) but a
 * different seed. Can actually be more interesting with a different
 * frequency
 */
var moistureFn = {
  noise: new Noise({
    min: 0,
    max: 1,
    octaves: 4,
    persistence: 1 / Math.pow( 2, 2 ),
    frequency: 1 / Math.pow( 2, 8 ),
    amplitude: 1,
    random: new PRNG( seed + 'moisture' )
  }),
  gens: [
    {
      fn: function( x, y ) {
        return easeInOut.get( this.noise.get( x, y ) )
      },
      weight: .85
    },
    {
      fn: function( x, y ) {
        return randomNoise.get( x, y )
      },
      weight: .15
    }
  ],
  get: function( x, y ) {
    return this.gens.reduce( ( prev, curr ) => {
      return prev + ( curr.fn.call( this, x, y ) * curr.weight )
    }, 0 )
  }
}

/**
 * Should be the same noise attributes (particularly frequency) but a
 * different seed. Can actually be more interesting with a different
 * frequency
 */
var temperatureFn = {
  noise: new Noise({
    min: 0,
    max: 1,
    octaves: 4,
    persistence: 1 / Math.pow( 2, 2 ),
    frequency: 1 / Math.pow( 2, 8 ),
    amplitude: 1,
    random: new PRNG( seed + 'temp' )
  }),
  gens: [
    {
      fn: function( x, y ) {
        return easeInOut.get( this.noise.get( x, y ) )
      },
      weight: .15
    },
    {
      fn: function( x, y ) {
        return 1.0 - heightmapFn.get( x, y )
      },
      weight: .75
    },
    {
      fn: function( x, y ) {
        return randomNoise.get( x, y )
      },
      weight: .1
    }
  ],
  get: function( x, y ) {
    return this.gens.reduce( ( prev, curr ) => {
      return prev + ( curr.fn.call( this, x, y ) * curr.weight )
    }, 0 )
  }
}

var randFn = {
  noise: new Noise({
    min: 0,
    max: 1,
    persistence: 1 / Math.pow( 2, 4 ),
    frequency: 1 / Math.pow( 2, 6 ), // less frequency (i.e. Math.pow( 2, 6 ) ) will clump together seed site skip omissions
    random: new PRNG( seed )
  }),
  get: function( x, y ) {
    return easeInOut.get( this.noise.get( x, y ) )
  }
}

var randomNoise = new Noise({
  min: 0,
  max: 1,
  persistence: 1 / Math.pow( 2, 4 ),
  frequency: 1 / Math.pow( 2, 4 ), // less frequency (i.e. Math.pow( 2, 6 ) ) will clump together seed site skip omissions
  random: new PRNG( seed )
})

var jitter = new Noise({
  min: 0,
  max: 1,
  persistence: 1 / Math.pow( 2, 2 ),
  frequency: 1 / Math.pow( 2, 2 ),
  random: new PRNG( seed )
})

var perturb = new Noise({
  min: -1,
  max: 1,
  persistence: 1 / Math.pow( 2, 1.25 ),
  frequency: 1 / Math.pow( 2, 4 ),
  random: new PRNG( seed )
})


class Options {
  constructor() {
    this.chunkSize = 16     // 16
    this.worldSize = 512    // 512
    this.siteDivisor = this.worldSize / this.chunkSize
    this.siteSkip = 0
    this.siteRelaxation = .75

    this.influenceDivisor = 3
    this.influenceRelaxation = .25
    this.influenceDropoff = .15
    this.influenceMultiplier = .75    // too high and influences can _bleed_ out of regions, linked to frequency of influencers though
    this.influenceTailLength = 3
    this.influenceTailReducer = .6  // Usually <1 but higher, so the tail grows, can get interesting
    this.influenceTailReducerVariation = .2

    // Noise functions
    // Basic heightmap, should extend over region boundaries to help keep things smooth
    this.heightmap = heightmapFn
    this.influencemap = influenceFn
    this.moisturemap = moistureFn
    this.temperaturemap = temperatureFn

    // Peaks and troughs, used to perturb a value positive or negative
    this.perturbmap = perturb
    // Random is actually fairly smooth
    this.random = randomNoise
    // Jitter is pretty uniformly distributed and good as a standard number generator
    this.jitter = jitter

    // Eased random generator
    this.randFn = randFn
  }
}

module.exports = new Options()
