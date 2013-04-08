var zlib = require('zlib');

// adds unzip method shim to zlib-browserify (imaya/zlib.js)
//
// @see https://github.com/brianloveswords/zlib-browserify
// @see https://github.com/imaya/zlib.js/blob/master/node/exports.js

zlib.unzip = function(buffer, callback) {
    //timer.start('zlib.unzip');

    // Avoid unnecessary conversion to Buffer with 'noBuffer', returns Uint8Array.
    // With Buffer shim both Buffer and Uint8Array are patched for use with pbf.js.
    var unzipped = zlib.inflateSync(buffer, {'noBuffer': true});

    //timer.stop('zlib.unzip');
    callback(null, unzipped);
};

module.exports = zlib;
