var pbf = require('../pbf.js');

// Require replacements/extensions of Browserify's globals shims.
// See transforms.js for source transforms.
require('./buffer.js');
require('./process.js');

/**
 * buffer - ArrayBuffer
 */
function BufferBlockFile(buffer){
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

      var fileblock = new pbf.Fileblock(buffer,offset);
      fileblock.readHeader( onblobread );
    };
    onblobread(null,0);
  };

  this.fileblock = function(n,callback){
    var i=0;
    this.read(function(fileblock){
      if(n==i){
        callback(fileblock);
      }
      i++;
    });
  };
}

/** One-pass read. Reads both nodes and ways from payload in one pass. */
function OnePassPBFFile(blockfile){
  this.read = function(onnode, onway, onfinish){
    var stillreading=true;
    var nstarted=0;
    var nfinished=0;

    // for each file block read just the header
    blockfile.read(function(fileblock){

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
  };
}

exports.BufferBlockFile = BufferBlockFile;
exports.OnePassPBFFile = OnePassPBFFile;
exports.PBFFile = pbf.PBFFile;
