require "coffee-script"
assert = require "assert"
constants = require("../lib/constants")
MockPongServer = require("./mock_pong_server")
PingSocket = require("../lib/gameserver").PingSocket

describe "Ping Socket", ->
  
  server = new MockPongServer()
  
  server.serverInfo = 
    protocol: 1
    name: "test server"
    map: "hallo"
    gamemodeNum: constants.gamemode("insta ctf")
    mastermodeNum: constants.mastermode("private")
    timeleft: 34
    numClients: 2
    maxClients: 16
  
  server.uptime = 10
  
  server.playerStats =
    1:
      cn: 1
      ping: 4
      name: "timmy"
      team: "evil"
      frags: 3
      deaths: 0
      teamkills: 0
      damage: 0
      health: 100
      gunselect: 1
      privilege: 0
      state: 0
      ip: [127, 0, 0, 1]
    
    2:
      cn: 2
      ping: 5
      name: "jimmy"
      team: "good"
      frags: 0
      deaths: 3
      teamkills: 0
      damage: 0
      health: 100
      gunselect: 1
      privilege: 0
      state: 0
      ip: [127, 0, 0, 1]
  
  server.teamMode = true
  server.teamStats = 
    good:
      score: 1
    evil:
      score: 0
  
  client = null
  
  beforeEach ->
    client = new PingSocket({socket: server})
  
  it "should get server info", (done) ->
    
    client.ping
      hostname: "localhost"
      query: "server"
      callback: (reply) ->
        
        assert.equal reply.protocol, 1
        assert.equal reply.name, "test server"
        assert.equal reply.map, "hallo"
        assert.equal reply.gamemode, "insta ctf"
        assert.equal reply.mastermodeNum, constants.mastermode("private")
        assert.equal reply.mastermode, "private"
        assert.equal reply.timeleft, 34
        assert.equal reply.numClients, 2
        assert.equal reply.maxClients, 16
        
        done()
  
  it "should get uptime", (done) ->
    
    client.ping
      hostname: "localhost"
      query: "uptime"
      callback: (reply) ->
        
        assert.equal reply.uptime, 10
        
        done()

  it "should get all player stats", (done) ->
    
    client.ping
      hostname: "localhost"
      query: "playerStats"
      callback: (reply) ->
        
        assert.equal reply.playerStats["1:127.0.0.0"].name, "timmy"
        assert.equal reply.playerStats["1:127.0.0.0"].frags, 3
        assert.equal reply.playerStats["1:127.0.0.0"].deaths, 0
        assert.equal reply.playerStats["1:127.0.0.0"].teamkills, 0
        assert.equal reply.playerStats["1:127.0.0.0"].damage, 0
        assert.equal reply.playerStats["1:127.0.0.0"].health, 100
        assert.equal reply.playerStats["1:127.0.0.0"].gunselect, 1
        assert.equal reply.playerStats["1:127.0.0.0"].privilege, 0
        assert.equal reply.playerStats["1:127.0.0.0"].state, 0
        assert.equal reply.playerStats["1:127.0.0.0"].ip, "127.0.0.0"
        
        assert.equal reply.playerStats["2:127.0.0.0"].name, "jimmy"
        
        done()
  
  it "should just get player stats for an individual player", (done) ->
    
    client.ping
      hostname: "localhost"
      query: "playerStats"
      cn: 2
      callback: (reply) ->
        
        assert.equal reply.playerStats["2:127.0.0.0"].name, "jimmy"
        assert.equal reply.playerStats["2:127.0.0.0"].frags, 0
        assert.equal reply.playerStats["2:127.0.0.0"].deaths, 3
        assert.equal reply.playerStats["2:127.0.0.0"].teamkills, 0
        assert.equal reply.playerStats["2:127.0.0.0"].damage, 0
        assert.equal reply.playerStats["2:127.0.0.0"].health, 100
        assert.equal reply.playerStats["2:127.0.0.0"].gunselect, 1
        assert.equal reply.playerStats["2:127.0.0.0"].privilege, 0
        assert.equal reply.playerStats["2:127.0.0.0"].state, 0
        assert.equal reply.playerStats["2:127.0.0.0"].ip, "127.0.0.0"
        
        done()
        
  it "should respond with an error when an unknown cn is queried", (done) ->
    
    client.on "error", ->
      # Prevent error being thrown by the default error listener
    
    client.ping
      hostname: "localhost"
      query: "playerStats"
      cn: 34
      callback: (reply, error) ->
        
        assert.equal reply, null
        assert.notEqual typeof error, "undefined"
        
        done()
  
  it "should get team stats", (done) ->
    
    client.ping
      hostname: "localhost"
      query: "teamStats"
      callback: (reply)->
        
        assert.equal reply.gamemode, constants.gamemode("insta ctf")
        assert.equal reply.timeleft, 34
        assert.equal reply.teams["good"].score, 1
        assert.equal reply.teams["evil"].score, 0
        
        done()
  
  it "should get team stats with bases", (done) ->
    
    server.teamStats =
      good:
        score: 6
        bases: [0,3,5]
      evil:
        score: 10
        bases: [1,2,4]
    
    client.ping
      hostname: "localhost"
      query: "teamStats"
      callback: (reply) ->
        
        assert.equal reply.teams["good"].score, 6
        assert.deepEqual reply.teams["good"].bases, [0,3,5]
        assert.deepEqual reply.teams["evil"].bases, [1,2,4]
        
        done()
