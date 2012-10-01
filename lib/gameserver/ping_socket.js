var dgram = require("dgram");
var sys = require("util");
var events = require("events");
var _ = require("underscore");
var packet_coding = require("./packet_coding");
var constants = require("./constants");

var PacketEncoder = packet_coding.PacketEncoder;
var PacketDecoder = packet_coding.PacketDecoder;
var time = Date.now;

var NO_ERROR = 0;
var ERROR = 1;
var EXTENDED_INFO_VERSION = 105;
var PLAYERSTATS_RESPONSE_IDS = -10;
var PLAYERSTATS_RESPONSE_STATS = -11;

function PingSocket(){
  this._socket = dgram.createSocket("udp4");
  this._socket.on("message", _.bind(this._readResponseMessage, this));
  this._requests = {};
  this._nextRequestID = 1;
}

sys.inherits(PingSocket, events.EventEmitter);

PingSocket.prototype.getAbsoluteRequestID = function(id, msgInfo){
  return msgInfo.address + ":" + msgInfo.port + ":" + id;
};

PingSocket.prototype.getRequest = function(id, msgInfo){
  var absID = this.getAbsoluteRequestID(id, msgInfo);
  return this._requests[absID];
};

PingSocket.prototype.createRequest = function(options){
  
  var self = this;
  
  options = _.extend({
    port: constants.PING_PORT,
    query: "server",
    timeout: 2000,
    id: this._nextRequestID
  }, options);
  
  var absID = this.getAbsoluteRequestID(options.id, options);
  
  var timeout = setTimeout(function(){
    complete(null, "ping timed out");
  }, options.timeout);
  
  var complete = function(){
    
    clearTimeout(timeout);
    
    var request = this._requests[absID];
    
    if(request === undefined){
      return;
    }
    
    if(options.callback !== undefined){
      options.callback.apply(self, arguments);
    }
    
    var isError = arguments[0] === null || arguments[0] === undefined;
    var args = Array.prototype.slice.call(arguments, 0);
    
    if(isError){
      
      args.shift();
      args.unshift(request);
      
      this.emit.apply(self, "error", args);
    }
    else{
      
      args.unshift(request);
      
      this.emit.apply(self, "pong", args);
    }
    
    delete this._requests[absID];
  };
  
  var cancel = function(){
    complete(null, "cancelled ping request (will ignore response)");
  };
  
  this._requests[absID] = {
    options: options,
    complete: complete,
    cancel: cancel
  };
  
  this._nextRequestID += 1;
};

PingSocket.prototype.ping = function(options){
  
  if(options.hostname === undefined){
    throw new Error("hostname undefined");
  }
  
  var request = this.createRequest(options);
  
  var packet = new PacketEncoder(new Buffer(16));
  
  var writeQuery = {
    "server": PingSocket.prototype._writePingServerQuery,
    "uptime": PingSocket.prototype._writePingUptimeQuery,
    "playerStats": PingSocket.prototype._writePingPlayerStatsQuery,
    "teamScore": PingSocket.prototype._writePingTeamScoreQuery
  }[options.query];
  
  if(writeQuery === undefined){
    throw new Error("unknown query type");
  }
  
  writeQuery.call(this, packet, request);
  
  var packetBuffer = packet.getWrittenSlice();
  
  this._socket.send(packetBuffer, 0, packetBuffer.length, options.port, options.hostname);
  
  return request;
};

PingSocket.prototype._writePingServerQuery = function(packet, request){
  request.sentAt = time();
  packet.writeInt(request.id);
};

PingSocket.prototype._writePingUptimeQuery = function(packet, request){
  packet.writeInt(0); // extended server info
  packet.writeInt(0); // uptime command
  packet.writeInt(request.id);
};

PingSocket.prototype._writePingPlayerStatsQuery = function(packet, request){
  packet.writeInt(0); // extended server info
  packet.writeInt(1); // playerstats command
  packet.writeInt(request.options.cn || -1); // target an individual player if options.cn is defined
  packet.writeInt(request.id);
};

PingSocket.prototype._writePingTeamScoreQuery = function(packet, request){
  requestEncoder.writeInt(0); // extended server info
  requestEncoder.writeInt(2); // teamscore command
  requestEncoder.writeInt(request.id);
};

PingSocket.prototype._readResponseMessage = function(msg, msgInfo){
  
  var packet = new PacketDecoder(msg);
  var requestID = packet.readInt();
  
  if(requestID !== 0){
    
    // Read standard ping response message
    
    var request = this.getRequest(requestID, msgInfo);
    
    if(request === undefined){
      return;
    }
    
    var pingTime = time() - request.sentAt;
    
    var numClients = packet.readInt();
    
    var numAttributes = packet.readInt();
    var attributes = [];
    for(var i = 0; i < numAttributes; i++){
      attributes.push(packet.readInt());
    }
    
    var protocol = attributes[0];
    var gamemodeNum = parseInt(attributes[1], 10);
    var timeLeft = parseInt(attributes[2], 10);
    var maxClients = parseInt(attributes[3], 10);
    var mastermodeNum = parseInt(attributes[4], 10);
    
    var mapName = packet.readString();
    var serverDescription = packet.readString();
    
    request.complete({
      "ping": pingTime,
      "protocol": protocol,
      "numClients": numClients,
      "maxClients": maxClients,
      "gamemode": constants.gamemode(gamemodeNum),
      "mastermode": constants.mastermode(mastermodeNum),
      "mastermodeNum": mastermodeNum,
      "map": mapName,
      "name": serverDescription
    });
  }
  else{
    this._readExtendedInfoResponse(packet, msgInfo);
  }
};

PingSocket.prototype._readExtendedInfoResponse = function(packet, msgInfo){
  
  var command = packet.readInt();
  
  var handler = [
    PingSocket.prototype._readUptimeResponse,
    PingSocket.prototype._readPlayerStatsResponse,
    PingSocket.prototype._readTeamScoreResponse
  ][command];
  
  if(handler !== undefined){
    handler.call(this, packet, msgInfo);
  }
};

PingSocket.prototype._readExtendedInfoHeader = function(packet){
  
  var ack = packet.readInt();
  if(ack !== -1){
    return false;
  }
  
  var version = packet.readInt();
  if(version !== EXTENDED_INFO_VERSION){
    return false;
  }
  
  return true;
};

PingSocket.prototype._readUptimeResponse = function(packet, msgInfo){
  
  var request = this.getRequest(packet.readInt());
  
  if(request === undefined){
    return;
  }
  
  if(this._readExtendedInfoHeader(packet) === false){
    return;
  }
  
  request.complete({
    uptime: packet.readInt()
  });
};

PingSocket.prototype._readPlayerStatsResponse = function(packet, msgInfo){
  
  var target = packet.readInt();
  
  var requestID = packet.readInt();  
  var request = this.getRequest(requestID, msgInfo);
  
  if(request === undefined){
    return;
  }
  
  if(this._readExtendedInfoHeader(packet) === false){
    return;
  }
  
  if(request.playerStats === undefined){
    request.playerStats = {};
  }
  
  var noError = packet.readInt();
  if(noError !== NO_ERROR){
    return;
  }
  
  var responseType = packet.readInt();
  
  if(responseType == PLAYERSTATS_RESPONSE_IDS){
    
    cnList = [];
    while(packet.bytesRemaining()){
      cnList.push(packet.readInt());
    }
    
    request.cnList = _.sortBy(cnList, _.identity);
  }
  else if(responseType == PLAYERSTATS_RESPONSE_STATS){
    
    var cn = packet.readInt();
    
    var int = _.bind(packet.readInt, packet);
    var string = _.bind(packet.readString, packet);
    
    var stats = {
      cn: cn,
      ping: int(),
      name: string(),
      team: string(),
      frags: int(),
      flags: int(),
      deaths: int(),
      teamkills: int(),
      damage: int(),
      health: int(),
      armour: int(),
      gunselect: int(),
      privilege: int(),
      state: int()
    };
    
    var ip_o1 = packet.readUInt8();
    var ip_o2 = packet.readUInt8();
    var ip_o3 = packet.readUInt8();
    
    stats.ip = ip_o1 + "."  + ip_o2 + "." + ip_o3 + ".0";
    stats.iplong = (ip_o1 << 24) | (ip_o2 << 16) | (ip_o3 << 8);
    
    var id = cn + ":" + stats.ip;
    stats.id = id;
    
    request.playerStats[id] = _.extend(request.playerStats[id] || {}, stats);
    
    // Remove cn from cnList
    request.cnList = _.reject(request.cnList, function(n){return n === cn;});
  }
  
  if(request.cnList){
    if(_.isEmpty(request.cnList)){
      request.complete({playerStats: request.playerStats});
    }
  }
};

module.exports = PingSocket;
