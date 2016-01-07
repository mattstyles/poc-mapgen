
'use strict';

var Noise = require( './noise' )
var Bezier = require( 'bezier-easing' )

var easeOutQuad = new Bezier( .55, 1, .55, 1 )
var easeInQuad = new Bezier( .75, .3, .8, .8 )
var easeInOutQuad = new Bezier( .8, 0, .7, 1 )
var easeInOut = new Bezier( .4, 0, .6, 1 )

var influenceFn = {
  noise: new Noise({
    persistence: 1 / Math.pow( 2, 9 ),
    frequency: 1 / Math.pow( 2, 8 ),
    octaves: 2
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
        return random.get( x, y )
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

var heightmapFn = {
  noise: new Noise({
    min: 0,
    max: 1,
    octaves: 4,
    persistence: 1 / Math.pow( 2, 2 ),
    frequency: 1 / Math.pow( 2, 8 ),
    amplitude: 1
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
        return random.get( x, y )
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

var randFn = {
  noise: new Noise({
    min: 0,
    max: 1,
    persistence: 1 / Math.pow( 2, 4 ),
    frequency: 1 / Math.pow( 2, 6 ) // less frequency (i.e. Math.pow( 2, 6 ) ) will clump together seed site skip omissions
  }),
  get: function( x, y ) {
    return easeInOut.get( this.noise.get( x, y ) )
  }
}

var random = new Noise({
  min: 0,
  max: 1,
  persistence: 1 / Math.pow( 2, 4 ),
  frequency: 1 / Math.pow( 2, 4 ) // less frequency (i.e. Math.pow( 2, 6 ) ) will clump together seed site skip omissions
})

var jitter = new Noise({
  min: 0,
  max: 1,
  persistence: 1 / Math.pow( 2, 2 ),
  frequency: 1 / Math.pow( 2, 2 )
})

var perturb = new Noise({
  min: -1,
  max: 1,
  persistence: 1 / Math.pow( 2, 1.25 ),
  frequency: 1 / Math.pow( 2, 4 )
})


class Options {
  constructor() {
    this.chunkSize = 16
    this.worldSize = 512
    this.siteDivisor = this.worldSize / this.chunkSize
    this.siteSkip = 0
    this.siteRelaxation = .75

    this.influenceDivisor = 3
    this.influenceRelaxation = .15
    this.influenceDropoff = .25
    this.influenceMultiplier = .75    // too high and influences can _bleed_ out of regions, linked to frequency of influencers though

    // Noise functions
    // Basic heightmap, should extend over region boundaries to help keep things smooth
    this.heightmap = heightmapFn
    this.influenceHeightmap = influenceFn

    // Peaks and troughs, used to perturb a value positive or negative
    this.perturbmap = perturb
    // Random is actually fairly smooth
    this.random = random
    // Jitter is pretty uniformly distributed and good as a standard number generator
    this.jitter = jitter

    this.randFn = randFn
  }
}

module.exports = new Options()
