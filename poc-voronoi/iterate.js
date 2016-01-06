
'use strict';

module.exports = function iterate( arr, fn ) {
  // @TODO check isndarray

  var width = arr.shape[ 0 ]
  var height = arr.shape[ 1 ]

  for ( var x = 0; x < width; x++ ) {
    for ( var y = 0; y < width; y++ ) {
      let item = arr.get( x, y )
      if ( item ) {
        fn( item )
      }
      // fn.call( arr, arr.get( x, y ) )
    }
  }
}
