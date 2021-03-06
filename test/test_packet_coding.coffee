assert = require "assert"
PacketEncoder = require "../lib/gameserver/PacketEncoder"
PacketDecoder = require "../lib/gameserver/PacketDecoder"

reset = (buffer) ->
  enc: new PacketEncoder(buffer)
  dec: new PacketDecoder(buffer)

code = (value, encodeOp, decodeOp) ->
  buffer = new Buffer(5000)
  packet = reset buffer
  packet.enc[encodeOp](value)
  assert.equal packet.dec[decodeOp](), value

describe "Packet encoding/decoding", ->
  
  it "should code int", ->
    code num, "writeInt", "readInt" for num in [0, 1, 128, 1234, -1, -128, 98655, -98655]
  
  it "should code unsigned int", ->
    code num, "writeUInt", "readUInt" for num in [0, 1, 128, 18000, 70564, 0x200000, 0x200001, 0xFFFFFFF, -1, -268435456]
  
  it "should code float", ->
    code num, "writeFloat", "readFloat" for num in [0, 1, -1, 1.5]
  
  it "should code string", ->
    code string, "writeString", "readString" for string in ["", "hello"]
    
  it "should not read a string past the null char", ->
    
    buffer = new Buffer 5000
    packet = reset buffer
    
    packet.enc.writeString "hello"
    packet.enc.writeString "world"
    
    assert.equal packet.dec.readString(), "hello"
    assert.equal packet.dec.readString(), "world"
