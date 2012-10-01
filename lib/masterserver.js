var net = require("net");
var _ = require("underscore");
var constants = require("./constants");

function defaultOptions(){
  return {
    hostname: "sauerbraten.org",
    port: constants.MASTERSERVER_PORT
  };
}

function downloadServerList(options){
  
  options = _.extend(defaultOptions(), {callback:function(){}}, options);
  
  var socket = new net.Socket();
  var buffer = "";
  
  socket.setEncoding("ascii");
  
  socket.on("connect", function(){
    socket.write("list\n");
  });
  
  socket.on("error", function(exception){
    options.callback(null, exception);
  });
  
  socket.on("data", function(data){
    buffer += data;
  });
  
  socket.on("end", function(){
    
    var servers = [];
    var lines = buffer.split("\n");
    
    for(var i = 0; i < lines.length; i++){
      var args = lines[i].split(" ");
      if(args.length >= 3){
        var ip = args[1];
        var port = parseInt(args[2], 10);
        servers.push([ip, port]);
      }
    }
    
    options.callback(servers);
  });
  
  socket.connect(options.port, options.hostname);
}

module.exports = {
  downloadServerList: downloadServerList
};
