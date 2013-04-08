// minimal fs module browser shim for pbf.js
//
// pbf.js usages:
//   fs.read(fd,buf, 0,4, this.fileoffset,function(err,bytesRead,buffer){
//   fs.read(fd,headerbuf,0,metathis.headersize, metathis.fileoffset+4,function(err,bytesRead,buffer){
//   fs.read(fd,blobbuf, 0,metathis.payloadsize,metathis.fileoffset+metathis.headersize+4,function(err,bytesRead,buffer){
// Node.js signature:
//   fs.read = function(fd, buffer, offset, length, position, callback) {
var read = function(arrayBuffer, viewBuffer, offset, length, position, callback) {
    //log('fs.read offset = ' + offset + ', length = ' + length + ', position ' + position);
    var viewBufferLength = viewBuffer.length;
    // ignore offset, always 0
    viewBuffer.set(new Uint8Array(arrayBuffer, position, length));

    if (!(viewBufferLength === viewBuffer.length)) {
        console.log('lengths dont match: ' + viewBufferLength + '!=' + viewBuffer.length);
        throw "lengths don't match: ";
    }

    // without args, never used in pbf.js (uses viewBuffer)
    callback();
};

exports.read = read;