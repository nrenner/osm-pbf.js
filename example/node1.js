// simple one node example for Node.js
var pbf = require("../pbf.js");

var path="./node1.osm.pbf";
var fileblockfile = new pbf.FileBlockFile(path);
var pbffile = new pbf.PBFFile(fileblockfile);

var nodes = [];
pbffile.nodes( function(node) {
    
    nodes.push(node);
    console.log(JSON.stringify(node, null, "  "));

}, function(){
      // finish
      console.log(nodes.length);
      console.log( "nodes finished" );

});
