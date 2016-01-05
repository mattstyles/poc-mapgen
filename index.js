
var Voronoi = require( './voronoi' )

var canvas = document.createElement( 'canvas' )
var renderDiagram = require( './render' )( canvas )


var box = {
  xl: 0,
  xr: 800,
  yt: 0,
  yb: 600
}

var voronoi = new Voronoi()




function render() {
  renderDiagram( voronoi )
}

window.Voronoi = Voronoi
window.box = box
window.voronoi = voronoi
