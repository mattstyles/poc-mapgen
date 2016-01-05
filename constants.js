
module.exports = {
  WORLD_SIZE: [ 400, 400 ],
  DIVISIONS: 32,

  SITES_KEY: 'voronoi_sites'
}


// [ 400, 400 ] with 32 subdivisions gives an avg area of ~230,
// which is roughly 15x15, a good chunk size
