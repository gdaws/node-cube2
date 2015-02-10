/*jslint node: true, indent: 2, unused: true, maxlen: 80, camelcase: true */

function PacketEncoder(buffer) {
  this._buffer = buffer;
  this._write = 0;
}

PacketEncoder.prototype.writeString = function(string) {
  
  var stringBuffer = new Buffer(string, "ascii");
  
  if (stringBuffer.length + 1 > this._buffer.length - this._write) {
    throw new Error("write string overflow");
  }
  
  stringBuffer.copy(this._buffer, this._write);
  
  this._buffer[this._write + stringBuffer.length] = 0;
  this._write += stringBuffer.length + 1;
};

PacketEncoder.prototype.writeByte = function(value) {
  
  if (this._write == this._buffer.length) {
    throw new Error("write int overflow");
  }
  
  this._buffer[this._write] = value;
  this._write += 1;
};

PacketEncoder.prototype._put = function() {
  
  var argc = arguments.length;
  
  for (var i = 0; i < argc; i++) {
    this.writeByte(arguments[i]);
  }
};

PacketEncoder.prototype.writeInt = function(value) {
  
  value = parseInt(value, 10);
  
  if (value < 128 && value > -127) {
    this._put(value);
  }
  else if (value < 0x8000 && value >= -0x8000) {
    this._put(0x80, value & 0xFF, (value >> 8) & 0xFF);
  }
  else {
    this._put(0x81, value & 0xFF, (value >> 8) & 0xFF, 
      (value >> 16) & 0xFF, (value >> 24) & 0xFF
    );
  }
};

PacketEncoder.prototype.writeUInt = function(value) {
  
  value = parseInt(value, 10);
  
  if(value < -0x10000000 || value > 0xFFFFFFF) {
    throw new Error("cannot write unsigned int outside of range -268435456" +
      " to 268435455");
  }
  
  if (value < 0 || value >= 0x200000) {
    this._put(
      0x80 | (value & 0x7F),
      0x80 | ((value >> 7) & 0x7F),
      0x80 | ((value >> 14) & 0x7F),
      value >> 21
    );
  }
  else if (value < 128) {
    this._put(value);
  }
  else if (value < 0x4000) {
    this._put(0x80 | (value & 0x7F), value >> 7);
  }
  else {
    this._put(
      0x80 | (value & 0x7F),
      0x80 | ((value >> 7) & 0x7F),
      value >> 14
    );
  }
};

PacketEncoder.prototype.writeFloat = function(value) {
  
  if (this._write + 4 > this._buffer.length) {
    throw new Error("write float overflow");
  }
  
  this._buffer.writeFloatLE(value, this._write);
  this._write += 4;
};

PacketEncoder.prototype.getWrittenSlice = function() {
  return this._buffer.slice(0, this._write);
};

module.exports = PacketEncoder;
