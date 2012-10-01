events = require "events"
packet_coding = require "../lib/gameserver/packet_coding"

PacketEncoder = packet_coding.PacketEncoder
PacketDecoder = packet_coding.PacketDecoder

class MockPongServer extends events.EventEmitter
  
  constructor: ->
    @serverInfo = {}
    @playerStats = {}
    @uptime = 0
  
  send: (buffer, offset, length, port, hostname, callback) ->
    
    packetIn = new PacketDecoder(buffer)
    packetOut = new PacketEncoder(new Buffer(5000))
    
    requestID = packetIn.readInt()
    
    if requestID != 0
      packetOut.writeInt requestID
      @replyWithServerInfo packetOut
     
    this.emit("message", packetOut.getWrittenSlice(), {port: port, address: hostname})
  
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

module.exports = MockPongServer
