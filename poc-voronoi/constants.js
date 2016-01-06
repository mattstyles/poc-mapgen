
var chunkSize = 128
var worldSize = 512

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
  }
}
