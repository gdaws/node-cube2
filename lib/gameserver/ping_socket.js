var dgram = require("dgram");
var sys = require("util");
var events = require("events");
var _ = require("underscore");
var packet_coding = require("./packet_coding");
var constants = require("../constants");

var PacketEncoder = packet_coding.PacketEncoder;
var PacketDecoder = packet_coding.PacketDecoder;
var time = Date.now;

function PingSocket(options){
  
  options = _.extend({
    socket: dgram.createSocket("udp4")
  }, options);
  
  this._socket = options.socket;
  this._socket.on("message", _.bind(this._readResponseMessage, this));
  this._requests = {};
  this._nextRequestID = 1;
}

sys.inherits(PingSocket, events.EventEmitter);

PingSocket.prototype.getAbsoluteRequestID = function(id, msgInfo){
  return (msgInfo.address || msgInfo.hostname) + ":" + msgInfo.port + ":" + id;
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
    
    var request = self._requests[absID];
    
    if(request === undefined || request._completeLock !== undefined){
      return;
    }
    
    request._completeLock = true;
    
    if(options.callback !== undefined){
      options.callback.apply(self, arguments);
    }
    
    var isError = arguments[0] === null || arguments[0] === undefined;
    var args = Array.prototype.slice.call(arguments, 0);
    
    if(isError){
      
      args.shift();
      args.unshift(request);
      args.unshift("error");
      
      self.emit.apply(self, args);
    }
    else{
      
      args.unshift(request);
      args.unshift("pong");
      
      self.emit.apply(self, args);
    }
    
    delete self._requests[absID];
  };
  
  var cancel = function(){
    complete(null, "cancelled ping request (will ignore response)");
  };
  
  var request = {
    options: options,
    complete: complete,
    cancel: cancel
  };
  
  this._requests[absID] = request;
  this._nextRequestID += 1;
  
  return request;
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
    "teamStats": PingSocket.prototype._writePingTeamStatsQuery
  }[options.query];
  
  if(writeQuery === undefined){
    throw new Error("unknown query type");
  }
  
  writeQuery.call(this, packet, request);
  
  var packetBuffer = packet.getWrittenSlice();
  
  this._socket.send(packetBuffer, 0, packetBuffer.length, request.options.port, request.options.hostname);
  
  return request;
};

PingSocket.prototype._writePingServerQuery = function(packet, request){
  request.sentAt = time();
  packet.writeInt(request.options.id);
};

PingSocket.prototype._writePingUptimeQuery = function(packet, request){
  packet.writeInt(0); // extended server info
  packet.writeInt(0); // uptime command
  packet.writeInt(request.options.id);
};

PingSocket.prototype._writePingPlayerStatsQuery = function(packet, request){
  packet.writeInt(0); // extended server info
  packet.writeInt(1); // playerstats command
  packet.writeInt(request.options.cn || -1); // target an individual player if options.cn is defined
  packet.writeInt(request.options.id);
};

PingSocket.prototype._writePingTeamStatsQuery = function(packet, request){
  packet.writeInt(0); // extended server info
  packet.writeInt(2); // teamscore command
  packet.writeInt(request.options.id);
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
    var timeleft = parseInt(attributes[2], 10);
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
      "timeleft": timeleft,
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
    PingSocket.prototype._readTeamStatsResponse
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
  if(version !== constants.PING_EXTINFO_VERSION){
    return false;
  }
  
  return true;
};

PingSocket.prototype._readUptimeResponse = function(packet, msgInfo){
  
  var request = this.getRequest(packet.readInt(), msgInfo);
  
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
  if(noError !== constants.PING_EXTINFO_NO_ERROR){
    request.complete(null, (target == -1 ? "could not get player stats" : "could not get player stats for player cn " + target));
    return;
  }
  
  var responseType = packet.readInt();
  
  if(responseType == constants.PING_EXTINFO_PLAYERSTATS_RESP_IDS){
    
    var cnList = [];
    while(packet.bytesRemaining()){
      cnList.push(packet.readInt());
    }
    
    request.cnList = _.sortBy(cnList, _.identity);
  }
  else if(responseType == constants.PING_EXTINFO_PLAYERSTATS_RESP_STATS){
        
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

PingSocket.prototype._readTeamStatsResponse = function(packet, msgInfo){
  
  var requestID = packet.readInt();
  var request = this.getRequest(requestID, msgInfo);
  
  if(request === undefined){
    return;
  }
  
  if(this._readExtendedInfoHeader(packet) === false){
    return;
  }
  
  var isTeamMode = packet.readInt();
  var gamemode = packet.readInt();
  var timeleft = packet.readInt();
  var teams = {};
  
  if(isTeamMode){
      
      var team;
      
      while(packet.bytesRemaining()){
        
        team = {};
        
        var name = packet.readString();
        team.score = packet.readInt();
        
        var numBases = packet.readInt();
        
        if(numBases > 0){
          team.bases = [];
          for(var i = 0; i < numBases; i++){
            team.bases.push(packet.readInt());
          }
        }
        
        teams[name] = team;
      }
  }
  
  request.complete({
    gamemode: gamemode,
    timeleft: timeleft,
    teams: teams
  });
};

PingSocket.prototype.close = function(){
  
  for(var key in this._requests){
    this._requests[key].cancel();
  }
  
  this._socket.close();
};

module.exports = PingSocket;
