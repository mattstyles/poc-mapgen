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

|influence relaxation noise|perturbs heightmap influencers|
|influence divisor|defines frequency of initial influencer distribution|
|influence dropoff|influence zones should drop to dead at a certain point|
|influence multiplier|affects resultant _sealevel_|
|influence tail length|affects influencer shape|
|influence tail reducer|how much each subsequent path sections in an influencer tail decreases/increases in size|
|influence reducer variation|some noise for the tail sizes|
|site relaxation noise|perturbs central site locations|
|chunk size|defines frequency of initial site distribution|
|seed skip|determines the number of initial seed sites that are skipped|

|noise functions||
|---|
|height noise|primary influence for z-height|
|influence noise|should usually match heightmap, but with separate easing/noise|
|moisture noise|noise frequency should match heightmap, but use a seperate seed to create variation| 
