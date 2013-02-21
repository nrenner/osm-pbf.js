/*
var fs = require('fs');
var zlib = require('zlib');
var protobuf = require('./protobuf.js');
*/

function BlobHeader(message){
  this.type = message.val(1).toString();
  this.indexdata = message.val(2);
  this.datasize = message.val(3);
}

function Fileblock(fd, fileoffset){
  this.fd=fd;
  this.fileoffset=fileoffset;
  this.headersize=null;
  this.payloadsize=null;
  this.len=null;
  this.header=null;
  this.payload=null;

  var metathis=this;

  this.readHeader = function(callback){
    // read header length
    var buf = new Buffer(4);
    fs.read(fd,buf,0,4,this.fileoffset,function(err,bytesRead,buffer){

      // read the header
      metathis.headersize = buf.readUInt32BE(0);
      var headerbuf = new Buffer(metathis.headersize);
      fs.read(fd,headerbuf,0,metathis.headersize,metathis.fileoffset+4,function(err,bytesRead,buffer){

        var headerMessage = new protobuf.Message( headerbuf );
        metathis.header= new BlobHeader(headerMessage);
        metathis.payloadsize = metathis.header.datasize;
        metathis.size=4+metathis.headersize+metathis.payloadsize;
        callback(metathis);
      });
    });
  }

  this.convertPayloadMessage = function(payload){
    var messageType={"OSMHeader":HeaderBlock,
                     "OSMData":PrimitiveBlock};

    return new messageType[this.header.type](payload);
  }

  this.readPayload = function(callback){
    // read the blob payload

    //timer.start('readPayload');
    var blobbuf = new Buffer(metathis.payloadsize);
    fs.read(fd,blobbuf,0,metathis.payloadsize,metathis.fileoffset+metathis.headersize+4,function(err,bytesRead,buffer){

      var packedBlobMessage = new protobuf.Message( blobbuf );

      if( packedBlobMessage.hasField(1) ) {
        metathis.payload=metathis.convertPayloadMessage(new protobuf.Message(packedBlobMessage.val(1)));
        callback( metathis.payload );
      } else if( packedBlobMessage.hasField(3) ) {
        zlib.unzip(packedBlobMessage.val(3),function(err,buffer){
          var unpackedBlobMessage = new protobuf.Message( buffer );
          metathis.payload = metathis.convertPayloadMessage(unpackedBlobMessage);
          //timer.stop('readPayload');
          callback( metathis.payload );
        });
      }
    });
  }

  this.read = function(callback){
    this.readHeader(function(fb){
      metathis.readPayload(callback);
    });
  }
}

function DenseKeysVals(buf){
  this.densedata = new protobuf.DenseData(buf);
  this.more = function(){
    return this.densedata.more();
  }
  this.next = function(){
    var ret = []

    while(true){
      var k=this.densedata.next();
      if(k==0)
        return ret;
      var v=this.densedata.next();
      ret.push([k,v]);
    }  
  }
}

/*
function StringTable(message){
  this.data = message.vals(1)
  this.get = function(i){
    return this.data[i].toString();
  }
}
//var counter = 0;
function StringTable(message){
  timer.start('StringTable_init');
  var bufs = message.vals(1);
  this.data = new Array(bufs.length);
  //console.log('counter = ' + counter);
  //counter = 0;
  //console.log('StringTable length = ' + bufs.length);
  for (var i=0; i < bufs.length; i++) {
      this.data[i] = bufs[i].toString();
  }
  bufs = null;
  timer.stop('StringTable_init');

  this.get = function(i){
    //counter++;
    return this.data[i];
  }
}

function StringTable(message){
  var bufs = message.vals(1);
  this.data = new Array(bufs.length);
  for (var i=0; i < bufs.length; i++) {
      this.data[i] = bufs[i].toString();
  }
  bufs = null;

  this.get = function(i){
    return this.data[i];
  }
}
*/

function getStringTable(message){
    var bufs = message.vals(1);
    var data = new Array(bufs.length);
    for (var i=0; i < bufs.length; i++) {
        data[i] = bufs[i].toString();
    }
    return data;
}


function DenseInfo(message) {
}

/*
function DenseNodes(message){
  this.message = message;
  //console.log('*** nodes: \n' + JSON.stringify(this.message));

  this.nodesSync = function(onnode,onfinish){
    if(!this.message.hasField(1)) {
      //debugger;
      onfinish();
      return; 
    }
    //debugger;

    var ids = new protobuf.DenseData( this.message.val(1) );
    var id = ids.next(true);

    var lats = new protobuf.DenseData( this.message.val(8) );
    var lat = lats.next(true);

    var lons = new protobuf.DenseData( this.message.val(9) );
    var lon = lons.next(true);

    if(this.message.hasField(10)){
      var keysvals = new DenseKeysVals( this.message.val(10) );
      var keyval = keysvals.next();
    }else{
      var keysvals=null;
    }

    if( id<0 ) {
      console.log( "DENSENODES FIRST NODE" );
      ids.i=0;
      id = ids.next(true);
      console.log( id, ids );
    }
   
    var node = {id:id,lat:lat/10000000,lon:lon/10000000,keyval:keyval};
//console.log(JSON.stringify(node));
    var progress = onnode(node);
    if( progress===false ){
      onfinish(false);
      return false;
    }
 
    var did;
    while( ids.more() ) {
      timer.start('node_dense');
      did = ids.next(true);
      id = did+id;
      lat = lats.next(true)+lat;
      lon = lons.next(true)+lon;
      keyval = keysvals ? keysvals.next() : null;

      if( id < 0 ) {
        console.log( "ID "+id+" < 0 " );
        console.log( ids );
        process.exit();
      }

      if( id<0 ) {
        console.log( "DENSENODES INTERMEDIATE NODE" );
        console.log( id, ids );
      }

      var node = {id:id,lat:lat/10000000,lon:lon/10000000,keyval:keyval};
//console.log(JSON.stringify(node));
      timer.stop('node_dense');
      progress = onnode(node);
      if( progress===false ){
        onfinish(false);
        return false;
      }
    }

    onfinish(true);

  }

  var metathis=this;
  this.nodes = function(onnode,onfinish){
    var func = function(){metathis.nodesSync(onnode,onfinish);};
    process.nextTick(func);
  }
  
}
*/
function DenseNodes(message) {
    //console.log('DenseNodes length = ' + message.val(1).length);
    this.message = message;
    this.nodesSync = function(onnode, onfinish) {
        if (!this.message.hasField(1)) {
            // debugger;
            onfinish();
            return;
        }
        // debugger;

        //timer.start('nodesSync');

        var ids = message.val(1);
        var lats = message.val(8);
        var lons = message.val(9);

        var iId = 0;
        var iLat = 0;
        var iLon = 0;
        var valdef;

        var id = 0;
        var lat = 0;
        var lon = 0;

        if (this.message.hasField(10)) {
            var keysvals = new DenseKeysVals(this.message.val(10));
            var keyval = keysvals.next();
        } else {
            var keysvals = null;
        }

        var did;
        while (iId < ids.length) {
            //timer.start('node_dense');
            valdef = protobuf.readSignedVarint(ids, iId);
            iId += valdef[1];
            did = valdef[0];
            id = did + id;
            
            valdef = protobuf.readSignedVarint(lats, iLat);
            iLat += valdef[1];
            lat = valdef[0] + lat;
            
            valdef = protobuf.readSignedVarint(lons, iLon);
            iLon += valdef[1];
            lon = valdef[0] + lon;

            keyval = keysvals ? keysvals.next() : null;

            if (id < 0) {
                if (iId === 0) {
                    console.log("DENSENODES FIRST NODE");
                } else {
                    console.log("DENSENODES INTERMEDIATE NODE");
                }
                console.log("ID " + id + " < 0 ");
                console.log(ids);
                process.exit();
            }

            var node = {
                id : id,
                lat : lat / 10000000,
                lon : lon / 10000000,
                keyval : keyval
            };
            //timer.stop('node_dense');
            progress = onnode(node);
            if (progress === false) {
                onfinish(false);
                return false;
            }
        }

        //timer.stop('nodesSync');

        onfinish(true);

    }

    var metathis = this;
    this.nodes = function(onnode, onfinish) {
        var func = function() {
            metathis.nodesSync(onnode, onfinish);
        };
        process.nextTick(func);
    }

}


/*
message Way {
   required int64 id = 1;
   // Parallel arrays.
   repeated uint32 keys = 2 [packed = true];
   repeated uint32 vals = 3 [packed = true];
 
   optional Info info = 4;
 
   repeated sint64 refs = 8 [packed = true];  // DELTA coded
}
 */

//this.keysvals = function(){
/*
function keysvals(message){
    ret = []    ;
    if(!message.hasField(2) || !message.hasField(3))
      return ret;

//    var keys = new protobuf.DenseData( message.val(2) );
//    var vals = new protobuf.DenseData( message.val(3) );
//
//    while(keys.more()){
//      ret.push( [keys.next(), vals.next()] );
//    }

    var keys = message.val(2);
    var vals = message.val(3);
    keys.index = 0;
    vals.index = 0;
    while (keys.index < keys.length) {
        ret.push( [protobuf.next(keys), protobuf.next(vals)] );
    }
    
    return ret;
}
*/

function keysvals(message){
    var ret = [];
    if(!message.hasField(2) || !message.hasField(3))
        return ret;

    var keys = message.val(2);
    var vals = message.val(3);
    var keyIndex = 0;
    var valIndex = 0;
    var valdef, key, val;

    while (keyIndex < keys.length) {
        // key
        valdef = protobuf.readVarint(keys, keyIndex);
        keyIndex += valdef[1];
        key = valdef[0];
    
        // value
        valdef = protobuf.readVarint(vals, valIndex);
        valIndex += valdef[1];
        val = valdef[0];
    
        ret.push([ key, val ]);
    }

    return ret;
}

/*
//this.refs = function(){
function refs(message){
    ret = [];
    var denserefs = new protobuf.DenseData( message.val(8) );
    if(denserefs.more()){
      var ref = denserefs.next(true);
      ret.push(ref);
    }

    while(denserefs.more()){
      var ref = denserefs.next(true)+ref;
      ret.push( ref );
    }
    return ret;
}
*/
function refs(message) {
    ret = [];
    var denserefs = message.val(8);
    var i = 0, ref = 0;
    var valdef;
    while (i < denserefs.length) {
        valdef = protobuf.readSignedVarint(denserefs, i);
        i += valdef[1];
        ref = valdef[0] + ref;

        ret.push(ref);
    }
    return ret;
}

/*
function Way(message){
  this.message=message;
  
  this.id = message.val(1);
  
}
*/

function PrimitiveGroup(message){
  this.dense=null;
  if( message.hasField(2) )
    this.dense = new DenseNodes( new protobuf.Message( message.val(2) ) );

  this.waysSync = function(onway,onfinish){
    if( message.hasField(3) ){
      var waymessages = message.vals(3);
      for(var i=0; i<waymessages.length; i++) {
        //timer.start('waysSync.way');
        var wayMsg = new protobuf.Message( waymessages[i] );
        //timer.stop('waysSync.way');
        //var way = new Way(wayMsg);
        onway(wayMsg);
      }
    }
    onfinish();
  }

  var metathis=this;
  this.ways = function(onway,onfinish){
    var foo = function(){metathis.waysSync(onway,onfinish);}
    process.nextTick(foo);
  }
}

function PrimitiveBlock(message){
  this.stringtable = getStringTable( new protobuf.Message( message.val(1) ) );
  // NR: unused?
  //this.primitivegroup = new PrimitiveGroup( new protobuf.Message( message.vals(2)[0] ) );
  this.primitivegroups=[];
  var msgs = message.vals(2);
  this.primitivegroupMessages  = new Array(msgs.length);
  for(var i=0; i<msgs.length; i++){
    var primitivegroupMessage = new protobuf.Message( msgs[i] );
    this.primitivegroupMessages[i] = primitivegroupMessage;
    this.primitivegroups.push( new PrimitiveGroup( primitivegroupMessage ) );
  }

  var metathis=this;
  this.nodes = function(callback,onfinish){
    //console.log( "primitiveblock has "+this.primitivegroups.length+" primitvegroups" );

    if(this.primitivegroups.length==2){
      //debugger;
    }

    var finished=0;
    var metathis=this;
    var finishcounter = function(){
      //console.log( "primitiveblock finished" );
      finished += 1;
      if( finished==metathis.primitivegroups.length ){
        onfinish();
      }
    }

    for(var i in this.primitivegroups){
      var primitivegroup = this.primitivegroups[i];

      if(primitivegroup.dense===null){
        finishcounter();
        continue;
      }

      primitivegroup.dense.nodes(function(node){
        if(node.id<0){
          console.log(node);
          process.exit();
        }

        //timer.start('node_keyval');
        var keyval={};
        if(node.keyval!==undefined && node.keyval!==null){
          for(var i=0; i<node.keyval.length; i++){
            var key = metathis.stringtable[node.keyval[i][0]];
            var val = metathis.stringtable[node.keyval[i][1]];
            keyval[key]=val;
          }
        }
        node.keyval=keyval;
        //timer.stop('node_keyval');
        //timer.start('node_callback');
        var result = callback(node); //if this callback returns false, dense.nodes stops iterating and returns
        //timer.stop('node_callback');
        return result;
        onfinish(false)
      },finishcounter);
    }
  }

  this.ways = function(onway,onfinish){
    //debugger

    var finished=0;
    var metathis=this;
    var finishcounter = function(){
      finished += 1;
      if( finished==metathis.primitivegroups.length ) {
        onfinish();
      }
    }

    for( var i in this.primitivegroups ){
      var primitivegroup = this.primitivegroups[i];

      primitivegroup.ways(function(wayMessage){
        var retway={};
        retway.id=wayMessage.val(1);

        var rawkeysvals=keysvals(wayMessage);
        retway.keysvals={}
        for(var i=0; i<rawkeysvals.length; i++){
          var key = metathis.stringtable[rawkeysvals[i][0]];
          var val = metathis.stringtable[rawkeysvals[i][1]];
          retway.keysvals[key]=val;
        }

        retway.refs = refs(wayMessage);
        onway(retway);
      },finishcounter);
    }
  }
}

function HeaderBlock(message){
}

function FileBlockFile(path){
  this.read = function(onblock,onfinish){
    fs.open( path, "r", function(err,fd) {
      var stats = fs.statSync( path );

      var offset=0;
      var onblobread = function(fb){
        if(fb){
          offset += fb.size;
          onblock(fb);
        }

        if(offset==stats.size) {
          if(onfinish!==undefined)
            onfinish();
          return;
        }

        var fileblock = new Fileblock(fd,offset);
        fileblock.readHeader( onblobread );
      }
      onblobread(null,0);
    });
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

function PBFFile(fileblockfile){
  this.nodes = function(onnode,onfinish){
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
        });
      }  
    },function(){
      stillreading=false;
    });
  }

  this.ways = function(onway,onfinish){
    var stillreading=true;
    var nstarted=0;
    var nfinished=0;


    // for each file block read just the header
    fileblockfile.read(function(fileblock){

      // if it's a data block
      if(fileblock.header.type==="OSMData"){

        // read the payload
        nstarted += 1;
        fileblock.readPayload(function(payload){

          // for each way in each file block
          // call the onway callback
 
          var waysReadThisPayload=0;

          payload.ways(function(way){waysReadThisPayload+=1;onway(way);}, function(normalexit){
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
/*
exports.FileBlockFile = FileBlockFile;
exports.PBFFile = PBFFile;
 */