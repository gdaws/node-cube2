var PingSocket = require("./PingSocket");
var Document = require("../utils/Document");
var sys = require("util");
var events = require("events");
var _ = require("underscore");

function ServerBrowser(options){
  
  events.EventEmitter.call(this);
  
  options = _.extend({
    pingsPerBurst:  20,
    socketRestTime: 10,
    serverRestTime: 2000,
    serverMaxErrors: 1800
  }, options);
  
  this._options = options;
  
  this._socket = new PingSocket(options);
  
  this._servers = [];
  this._serversByID = {};
  
  this._timeout = null;
  this._pingFromIndex = 0;
}

sys.inherits(ServerBrowser, events.EventEmitter);

ServerBrowser.prototype.addListener = function(){
  var ret = events.EventEmitter.prototype.addListener.apply(this, arguments);
  this._updateTimer();
  return ret;
};

ServerBrowser.prototype.on = ServerBrowser.prototype.addListener;

ServerBrowser.prototype.addServer = function(hostname, port){
  
  var self = this;
  var key = hostname + ":" + port;
  
  if(this._servers[key] !== undefined){
    return;
  }
  
  var server = {
    hostname: hostname,
    port: port,
    pingPort: port + 1,
    id: hostname + ":" + port
  };
  
  var errors = 0;
  
  var monitorServerStatus = function(reply, errorMessage){
    
    if(reply === undefined){
      errors += 1;
      if(errors > self._options.serverMaxErrors){
        self.removeServer(hostname, port);
      }
      return;
    }
    
    errors = 0;
    
    return reply;
  };
  
  var createPingFunction = _.bind(this._createPingFunction, this);
  
  server["serverStats"] = new GameServerStats({ping: createPingFunction(server, "server", monitorServerStatus)});
  server["playerStats"] = new GameServerStats({ping: createPingFunction(server, "playerStats", extract("playerStats"))});
  server["teamStats"] = new GameServerStats({ping: createPingFunction(server, "teamStats", extract("teamStats"))});
  
  this._servers.push(server);
  this._serversByID[key] = server;
  
  this._updateTimer();
  
  return server;
};

ServerBrowser.prototype._createPingFunction = function(server, query, replyCallback){
  
  var browser = this;
  var socket = browser._socket;
  
  return function(updateDocument){
    
    socket.ping({
      
      hostname: server.hostname,
      port: server.pingPort,
      query: query,
      
      callback: function(reply, errorMessage){
        
        if(reply === null){
          replyCallback(reply, errorMessage);
          return;
        }
        
        reply = replyCallback(reply);
        
        if(reply === undefined){
          return;
        }
        
        if(updateDocument(reply) > 0){
          browser.emit("change", query, server);
          browser.emit("change:" + query, server);
        }
      }
    });
  };
};

ServerBrowser.prototype.removeServer = function(hostname, port){
  
  var key = hostname + ":" + port;
  
  var server = this._serversByID[key];
  if(server === undefined){
    return;
  }
  
  delete this._serversByID[key];
  
  var numServers = this._servers.length;
  var servers = this._servers;
  for(var i = 0; i < numServer; i++){
    if(servers[i] === server){
      servers.splice(i, 1);
      break;
    }
  }
  
  this.emit("remove", hostname, port, server);
};

ServerBrowser.prototype.get = function(hostname, port){
  
  if(arguments.length === 0){
    return this._servers;
  }
  
  return this._serversByID[hostname + ":" + port];
};

ServerBrowser.prototype._updateTimer = function(){
  
  var resetTime;
  var numServers = this._servers.length;
  
  if(hasEventListeners.call(this)){
    restTime = Math.max(this._options.socketRestTime, Math.min(numServers, this._options.pingsPerBurst) / numServers * this._options.serverRestTime);
  }
  else{
    restTime = Infinity;
  }
  
  if(this._timeout !== null){
    if(restTime === Infinity){
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }
  else{
    if(restTime !== Infinity){
      this._timeout = setTimeout(_.bind(ServerBrowser.prototype._sendPings, this), restTime);
    }
  }
};

ServerBrowser.prototype._sendPings = function(){
  
  this._timeout = null;
  
  var servers = this._servers;
  var numServers = servers.length;
  
  var pingsPerBurst = Math.min(this._options.pingsPerBurst, numServers);
  var serverIndex = this._pingFromIndex;
  
  for(var i = 0; i < pingsPerBurst; i++){
    
    var server = servers[serverIndex];
    
    server.serverStats.ping();
    
    if(server.serverStats.get("numClients") > 0){
      
      if(server.playerStats.hasEventListeners()){
        server.playerStats.ping();
      }
      
      if(server.teamStats.hasEventListeners()){
        server.teamStats.ping();
      }
    }
    
    serverIndex = (serverIndex + 1) % numServers;
  }
  
  this._pingFromIndex = serverIndex;
  
  this._updateTimer();
};

function extract(key){
  return function(data){
    return data[key];
  };
}

function hasEventListeners(){
  
  var allListeners = this._events;
  
  if(!_.isObject(allListeners)){
    return false;
  }
  
  var keys = _.keys(allListeners);
  var numKeys = keys.length;
  
  var listeners = events.EventEmitter.prototype.listeners;
  
  for(var i = 0; i < numKeys; i++){
    if(listeners.call(this, keys[i]).length > 0){
      return true;
    }
  }
  
  return false;
}

function GameServerStats(options){
  Document.call(this);
  options = _.extend({}, options);
  this.ping = _.bind(options.ping, null, _.bind(Document.prototype.put, this));
}

sys.inherits(GameServerStats, Document);

GameServerStats.prototype.hasEventListeners = function(){
  return hasEventListeners.apply(this, arguments);
};

module.exports = ServerBrowser;
