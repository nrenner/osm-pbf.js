var protobuf = (function(){

var WIRETYPE={'LENGTH':2,
              'VARINT':0};

function more_bytes(bb){
  return (bb&0x80)==0x80;
}
function strip_msb(bb){
  return 0x7f&bb;
}
function get_wire_type(val){
  return 0x07&val;
}
function get_field_number(val){
  return val>>3;
}
function decode_signed(val){ 
  //zigzag encoding
  if(val%2==0)
    return val/2;
  return -((val+1)/2);
}
/*
Orig
function decode_signed(val){
  timer.start('decode_signed');
  var ret = decode_signedOrig(val);
  timer.stop('decode_signed');
  return ret;
}
*/

/*
function readVarint( ary, offset ){
  //timer.start('readVarint');

  var i=offset;
  var bytes = [strip_msb(ary[i])];
  while( more_bytes(ary[i]) && i<ary.length-1 ){
    i += 1;
    bytes.push( strip_msb(ary[i]) );
  }

  var val = 0;
  for(i=0; i<bytes.length; i++){
    val += bytes[i]*Math.pow(2,(7*i));  //if you do a bit shift, unexpected negative numbers result sometimes
  }

  //timer.stop('readVarint');
  return [val,i];
}

function readVarint( ary, offset ){
  var i=offset;
  var bytes = [strip_msb(ary[i])];
  while( more_bytes(ary[i]) && i<ary.length-1 ){
    i += 1;
    bytes.push( strip_msb(ary[i]) );
  }

  var val = 0;
  for(i=0; i<bytes.length; i++){
    val += bytes[i]*Math.pow(2,(7*i));  //if you do a bit shift, unexpected negative numbers result sometimes
  }
  return [val,i];
}
*/
function readVarint(ary, offset) {
    var index = offset;
    var val = strip_msb(ary[index]);
    var i = 1;
    while (more_bytes(ary[index]) && index < ary.length - 1) {
        index += 1;
        val += strip_msb(ary[index]) * Math.pow(2, (7 * i));
        //val += strip_msb(ary[index]) << (7 * i);
        i++;
    }

    return [ val, i ];
}

function readSignedVarint(ary, offset) {
    var valdef = readVarint(ary, offset);
    valdef[0] = decode_signed(valdef[0]); 
    return valdef;
}

function readField(buf,offset){
  //timer.start('readField');
  var nread=0;

  var fielddef = readVarint(buf,offset);
  var wire_type = get_wire_type(fielddef[0]);
  var field_number = get_field_number(fielddef[0]);
  nread += fielddef[1];

  var val = null;
  if(wire_type==WIRETYPE.LENGTH){
    var strlendef = readVarint(buf,offset+nread);
    var strlen = strlendef[0];
    nread += strlendef[1]; 
    val = buf.slice(offset+nread,offset+nread+strlen);
    nread += strlen;
  } else if(wire_type==WIRETYPE.VARINT) {
    valdef = readVarint( buf, offset+nread );
    val = valdef[0];
    nread += valdef[1];
  }

  //timer.stop('readField');
  return [field_number, val, nread];
}

/*
function next(buf, signed) {
    var valdef;
    valdef = readVarint(buf, buf.index);
    buf.index += valdef[1];
    if (signed === true)
        return decode_signed(valdef[0]);
    else
        return valdef[0];
}
*/

function DenseData(buf){
  this.buf=buf;
  this.i=0;
  this.more = function(){
    return this.i<this.buf.length;
  }

  this.next = function(signed){
    var valdef;
    valdef = readVarint(this.buf,this.i);
    this.i += valdef[1];
    if(signed===true)
      return decode_signed(valdef[0]);
    else
      return valdef[0];
  }

/*
  Orig
  this.next =  function(signed){
      timer.start('next');
      var result = this.nextOrig(signed);
      timer.stop('next');
      return result;
  }
*/
}


function Message(buf){
  //timer.start('Message');
  this.fields = {}

  var offset=0;
  while(offset<buf.length){
    var field = readField( buf, offset );
    var ftag=field[0].toString();
    var fval=field[1];
    var flen=field[2];

    if(this.fields[ftag] === undefined){
      this.fields[ftag] = []
    }

    this.fields[ftag].push(fval);
    offset += flen;
    
  }
  //timer.stop('Message');

  this.val = function(tag){
    if(!this.hasField(tag))
      return null;
    return this.fields[tag.toString()][0];
  }
  this.vals = function(tag){
    if(!this.hasField(tag))
      return []
    return this.fields[tag.toString()];
  }
  this.hasField = function(tag){
    return this.fields[tag.toString()]!==undefined
  }
}

//return { decode_signed: decode_signed, Message: Message, DenseData: DenseData };
// for profiling
return { decode_signed: decode_signed, Message: Message, DenseData: DenseData, readVarint: readVarint, readSignedVarint: readSignedVarint };
})();
/*
exports.decode_signed=decode_signed;
exports.Message=Message;
exports.DenseData=DenseData;
*/