events = require "events"
constants = require "../lib/constants"
packet_coding = require "../lib/gameserver/packet_coding"

PacketEncoder = packet_coding.PacketEncoder
PacketDecoder = packet_coding.PacketDecoder

class MockPongServer extends events.EventEmitter
  
  constructor: ->
    @serverInfo = {}
    @playerStats = {}
    @uptime = 0
    @teamMode = false
    @teamStats = {}
    
  send: (buffer, offset, length, port, hostname, callback) ->
    
    packetIn = new PacketDecoder(buffer)
    packetOut = new PacketEncoder(new Buffer(5000))
    
    requestID = packetIn.readInt()
    
    msgInfo =
      port: port
      address: hostname
    
    if requestID != 0
      packetOut.writeInt requestID
      @replyWithServerInfo packetOut
    else
      query = packetIn.readInt()
      
      switch query
        when 0 then @replyWithUptime packetIn, packetOut
        when 1 then @replyWithPlayerStats packetIn, packetOut, msgInfo
        when 2 then @replyWithTeamScore packetIn, packetOut
    
    this.emit("message", packetOut.getWrittenSlice(), msgInfo)
    
  queueMessage: (packet, msgInfo) ->
    buffer = packet.getWrittenSlice()
    setTimeout =>
      @emit "message", buffer, msgInfo
    , 0
  
  replyWithServerInfo: (packet) ->
    
    packet.writeInt @serverInfo.numClients
    
    packet.writeInt 5
    packet.writeInt @serverInfo.protocol
    packet.writeInt @serverInfo.gamemodeNum
    packet.writeInt @serverInfo.timeleft
    packet.writeInt @serverInfo.maxClients
    packet.writeInt @serverInfo.mastermodeNum
    
    packet.writeString @serverInfo.map
    packet.writeString @serverInfo.name
    
  replyWithUptime: (input, output) ->
    
    requestID = input.readInt()
    
    output.writeInt 0
    output.writeInt constants.PING_EXTINFO_UPTIME
    output.writeInt requestID
    
    output.writeInt constants.PING_EXTINFO_ACK
    output.writeInt constants.PING_EXTINFO_VERSION
    
    output.writeInt @uptime
    
  replyWithPlayerStats: (input, output, msgInfo) ->
    
    cn = input.readInt()
    requestID = input.readInt()
    
    write = (output) ->
      
      output.writeInt 0
      output.writeInt constants.PING_EXTINFO_PLAYERSTATS
      output.writeInt cn
      output.writeInt requestID
      
      output.writeInt constants.PING_EXTINFO_ACK
      output.writeInt constants.PING_EXTINFO_VERSION
    
    writeStats = (stats, output) ->
      
      write output
      
      output.writeInt constants.PING_EXTINFO_NO_ERROR
      output.writeInt constants.PING_EXTINFO_PLAYERSTATS_RESP_STATS
      
      output.writeInt stats.cn
      output.writeInt stats.ping
      output.writeString stats.name
      output.writeString stats.team
      output.writeInt stats.frags
      output.writeInt stats.flags
      output.writeInt stats.deaths
      output.writeInt stats.teamkills
      output.writeInt stats.damage
      output.writeInt stats.health
      output.writeInt stats.armour
      output.writeInt stats.gunselect
      output.writeInt stats.privilege
      output.writeInt stats.state
      output.writeInt stats.ip[0]
      output.writeInt stats.ip[1]
      output.writeInt stats.ip[2]
    
    write output
    
    if cn != -1
      player = @playerStats[cn]
      if not player?
        output.writeInt constants.PING_EXTINFO_ERROR
        return
    
    output.writeInt constants.PING_EXTINFO_NO_ERROR
    output.writeInt constants.PING_EXTINFO_PLAYERSTATS_RESP_IDS
    
    if cn is -1
      for playerCn of @playerStats
        output.writeInt playerCn
    else
      output.writeInt cn
    
    for _, player of @playerStats
      statsPacket = new PacketEncoder(new Buffer(5000))
      writeStats player, statsPacket
      @queueMessage statsPacket, msgInfo
  
  replyWithTeamScore: (input, output) ->
    
    requestID = input.readInt()
    
    output.writeInt 0
    output.writeInt constants.PING_EXTINFO_TEAMSCORE
    output.writeInt requestID
    
    output.writeInt constants.PING_EXTINFO_ACK
    output.writeInt constants.PING_EXTINFO_VERSION
    
    if @teamMode == true
      output.writeInt 1
    else 
      output.writeInt 0
    
    output.writeInt @serverInfo.gamemodeNum
    output.writeInt @serverInfo.timeleft
    
    if @teamMode == false
      return
    
    for name, team of @teamStats
      
      output.writeString name
      output.writeInt team.score
      
      if team.bases?
        output.writeInt team.bases.length
        output.writeInt index for index in team.bases
      else
        output.writeInt -1

module.exports = MockPongServer
