
'use strict';

var Noise = require( './noise' )

class Options {
  constructor() {
    this.chunkSize = 16
    this.worldSize = 512
    this.siteDivisor = this.worldSize / this.chunkSize
    this.siteSkip = 0
    this.siteRelaxation = .75

    this.influenceDivisor = 3
    this.influenceRelaxation = .15
    this.influenceDropoff = .5
    this.influenceMultiplier = .65

    // Noise functions
    // Basic heightmap, should extend over region boundaries to help keep things smooth
    this.heightmap = new Noise({
      min: 0,
      max: 1,
      octaves: 4,
      persistence: 1 / Math.pow( 2, 3 ),
      frequency: 1 / Math.pow( 2, 10 ),
      amplitude: 1
    })
    // Peaks and troughs, used to perturb a value positive or negative
    this.perturbmap = new Noise({
      min: -1,
      max: 1,
      persistence: 1 / Math.pow( 2, 1.25 ),
      frequency: 1 / Math.pow( 2, 4 )
    })
    // Random is actually fairly smooth
    this.random = new Noise({
      min: 0,
      max: 1,
      persistence: 1 / Math.pow( 2, 4 ),
      frequency: 1 / Math.pow( 2, 4 ) // less frequency (i.e. Math.pow( 2, 6 ) ) will clump together seed site skip omissions
    })
    // Jitter is pretty uniformly distributed and good as a standard number generator
    this.jitter = new Noise({
      min: 0,
      max: 1,
      persistence: 1 / Math.pow( 2, 2 ),
      frequency: 1 / Math.pow( 2, 2 )
    })
  }
}

module.exports = new Options()
