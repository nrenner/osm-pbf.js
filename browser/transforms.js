var through = require('through');

// replaces or extends Browserify's builtin core module/globals shims
module.exports = function(file) {
    var data = '';

    function write(buf) {
        data += buf;
    }
    function end() {
        data = data.replace("require('fs')", "require('./browser/fs.js')");

        // Replace usages of global Buffer object with custom browser shim (./buffer.js), because
        // builtin Browserify shim does not use typed arrays and can't be replaced easily. 
        data = data.replace(/\bBuffer\b/g, "BufferShim");

        // don't replace in ./zlib.js, loads and extends 'zlib' module shim
        if (file.indexOf("zlib.js") < 0) {
            data = data.replace("require('zlib')", "require('./browser/zlib.js')");
        }

        this.queue(data);
        this.queue(null);
    }

    return through(write, end);
};
