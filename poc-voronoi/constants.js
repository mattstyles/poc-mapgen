
var chunkSize = 16
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


// [ 400, 400 ] with 32 subdivisions gives an avg area of ~230,
// which is roughly 15x15, a good chunk size
