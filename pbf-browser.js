

function log(msg) {
    //console.log(msg);
}

//
// node.js
//

process = {};

process.nextTick = function(func) {
    //setTimeout(func, 0)
    func();
};

Buffer = Uint8Array;

Buffer.prototype.readUInt32BE = function(offset) {
    return new DataView(this.buffer).getUint32(offset, false);
};

Buffer.prototype.slice = function(begin, end) {
    return this.subarray(begin, end);
};

Buffer.prototype.toString = function() {
    return String.fromCharCode.apply(null, this);
};


fs = {};

// pbf.js usages:
// fs.read(fd,buf,      0,4,                   this.fileoffset,function(err,bytesRead,buffer){
// fs.read(fd,headerbuf,0,metathis.headersize, metathis.fileoffset+4,function(err,bytesRead,buffer){
// fs.read(fd,blobbuf,  0,metathis.payloadsize,metathis.fileoffset+metathis.headersize+4,function(err,bytesRead,buffer){
// node.js:
// fs.read = function(fd, buffer, offset, length, position, callback) {
fs.read = function(arrayBuffer, viewBuffer, offset, length, position, callback) {
    log('fs.read offset = ' + offset + ', length = ' + length + ', position ' + position);
    var viewBufferLength = viewBuffer.length;
    // ignore offset, always 0
    viewBuffer.set(new Uint8Array(arrayBuffer, position, length));

    if (!(viewBufferLength === viewBuffer.length)) {
        console.log('lengths dont match: ' + viewBufferLength + '!=' + viewBuffer.length);
        throw "lengths don't match: ";
    }

    // without args, never used
    callback();
};


// zlib.unzip(packedBlobMessage.val(3),function(err,buffer){
zlib = {};

zlib.unzip = function(buffer, callback) {
    // get raw deflate without zlib header (2 bytes) and checkum footer (4 bytes)
    log('unzip, bytes: ' + (buffer.byteLength-6));
    //timer.start('zlib.unzip');
    var unzipped = Zlib.inflate(buffer.subarray(2, buffer.byteLength-4));
    //timer.stop('zlib.unzip');
    callback(null, unzipped);
};


//
// pbf.js
//

/**
 * buffer - ArrayBuffer
 */
function Html5BlockFile(buffer){
  this.read = function(onblock,onfinish){
    var offset=0;
    var onblobread = function(fb){
      if(fb){
        offset += fb.size;
        onblock(fb);
      }

      if(offset==buffer.byteLength) {
        if(onfinish!==undefined)
          onfinish();
        return;
      }

      var fileblock = new Fileblock(buffer,offset);
      fileblock.readHeader( onblobread );
    }
    onblobread(null,0);
  }

  this.fileblock = function(n,callback){
    var i=0;
    this.read(function(fileblock){
      if(n==i){
        callback(fileblock);
      } 
      i++;
    });
  }
}

/** One-pass read. Reads both nodes and ways from payload in one pass. */
function Html5PBFFile(fileblockfile){
  this.read = function(onnode, onway, onfinish){
    var stillreading=true;
    var nstarted=0;
    var nfinished=0;

    // for each file block read just the header
    fileblockfile.read(function(fileblock){

      // if it's a data block
      if(fileblock.header.type==="OSMData"){

        // read the payload
        nstarted += 1;
        var dd = nstarted;
        fileblock.readPayload(function(payload){
          //console.log( "read payload "+dd );

          // for each node in each file block
          // call the onnode callback
          payload.nodes(onnode, function(normalexit){
            if(normalexit===false){
              onfinish(false);
              return false;
            }

            // when finished, check if it is the last node ever; if so, call the onfinish callback
            nfinished += 1;

            //console.log( dd+" "+nfinished+"/"+nstarted+" finished" );
            if(!stillreading && (nfinished==nstarted)){
              onfinish(true);
            }
          });
          
          // for each way in each file block
          // call the onway callback
          payload.ways(onway, function(normalexit){
            if(normalexit===false){
              onfinish(false);
              return false;
            }

            // when finished, check if it is the last way ever; if so, call the onfinish callback
            nfinished += 1;

            if(!stillreading && (nfinished==nstarted)){
              onfinish(true);
            }
          });
          
        });
      }  
    },function(){
      stillreading=false;
    });
  }
}
