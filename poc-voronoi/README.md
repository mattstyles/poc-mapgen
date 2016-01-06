# poc-voronoi

Uses a voronoi diagram and underlying simplex noise to create biomes and regions.

|Elements||
|---|
|world|collection of regions|
|regions|defines a voronoi region|
|chunk|each voronoi cell references a chunk type|
|sites|seed locations for voronoi|
|influencer|circular heightmap light|

|Varying||
|---|
|height noise|primary influence for z-height|
|influence relaxation noise|perturbs heightmap influencers|
|influence divisor|defines frequency of initial influencer distribution|
|influence dropoff|influence zones should drop to dead at a certain point|
|influence multiplier|affects resultant _sealevel_|
|site relaxation noise|perturbs central site locations|
|chunk size|defines frequency of initial site distribution|
|seed skip|determines the number of initial seed sites that are skipped|
