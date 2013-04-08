// modifies Browserify's process shim with synchronous nextTick

process.nextTick = function(func) {
    // process.nextTick synchronous - onfinish is not called
    func();
};
