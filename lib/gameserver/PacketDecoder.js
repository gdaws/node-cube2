/*jslint node: true, indent: 2, unused: true, maxlen: 80, camelcase: true */

function PacketDecoder(buffer) {
  this._buffer = buffer;
  this._read = 0;
}

PacketDecoder.prototype.bytesRemaining = function() {
  return this._buffer.length - this._read;
};

PacketDecoder.prototype._readable = function(bytes) {
  if (this._read + bytes > this._buffer.length) {
    throw new Error("read overflow");
  }
};

PacketDecoder.prototype._readByte = function() {
  this._readable(1);
  var byte = this._buffer[this._read];
  this._read += 1;
  return byte;
};

PacketDecoder.prototype._readInt8 = function() {
  this._readable(1);
  var byte = this._buffer.readInt8(this._read);
  this._read += 1;
  return byte;
};

PacketDecoder.prototype._readInt16 = function() {
  this._readable(2);
  var short = this._buffer.readInt16LE(this._read);
  this._read += 2;
  return short;
};

PacketDecoder.prototype._readInt32 = function() {
  this._readable(4);
  var short = this._buffer.readInt32LE(this._read);
  this._read += 4;
  return short;
};

PacketDecoder.prototype.readString = function() {
  
  var result = "";
  var terminated = false;
  
  while (!terminated && this._read < this._buffer.length) {
    
    var charCode = this._readByte();
    
    if(charCode > 0){
      result += String.fromCharCode(charCode);
    }
    else terminated = true;
  }
  
  return result;
};

PacketDecoder.prototype.readUInt8 = function() {
  return this._readByte();
};

PacketDecoder.prototype.readInt = function() {
  
  var n = this._readInt8();
  
  if(n == -128){
    return this._readInt16();
  }
  else if(n == -127){
    return this._readInt32();
  }
  else return n;
};

PacketDecoder.prototype.readUInt = function() {
  
  var n = this._readByte();
  
  if (n & 0x80) {
    n += (this._readByte() << 7) - 0x80;
    if(n & 0x4000) n += (this._readByte() << 14) - 0x4000;
    if(n & 0x200000) n += (this._readByte() << 21) - 0x200000;
    if(n & 0x10000000) n |= 0xF0000000;
  }
  
  return n;
};

PacketDecoder.prototype.readFloat = function() {
  this._readable(4);
  var value = this._buffer.readFloatLE(this._read);
  this._read += 4;
  return value;
};

module.exports = PacketDecoder;
