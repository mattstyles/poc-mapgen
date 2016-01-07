
'use strict';

var chunkSize = 128
var worldSize = 512


function mirror( arr ) {
  let output = {}
  arr.forEach( item => output[ item.toUpperCase() ] = item.toLowerCase() )
  return output
}

module.exports = {
  CHUNK_SIZE: chunkSize,
  WORLD_SIZE: [ worldSize, worldSize ],
  DIVISIONS: worldSize / chunkSize,

  SITES_KEY: 'voronoi_sites',
  EDGES: {
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom'
  },

  BIOMES: mirror([
    'OCEAN',
    'SNOW',
    'TUNDRA',
    'SCORCHED',
    'TAIGA',
    'SHRUBLAND',
    'TEMPERATE_DESERT',
    'TEMPERATE_RAINFOREST',
    'TEMPERATE_FOREST',
    'GRASSLAND',
    'DESERT',
    'TROPICAL_RAINFOREST',
    'PLAINS',
    'TROPICAL_FOREST'
  ])

}
