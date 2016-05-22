/**
 * Module dependencies
 */

var nooljs = require('./server/nooljs');



// Instantiate and expose a nooljs singleton
module.exports = new nooljs();

// Expose constructor for convenience/tests
module.exports.nooljs = nooljs;