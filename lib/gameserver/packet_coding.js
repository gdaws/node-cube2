
function PacketEncoder(buffer){
  this._buffer = buffer;
  this._write = 0;
}

PacketEncoder.prototype.writeString = function(string){
  
  var stringBuffer = new Buffer(string, "ascii");
  
  if(stringBuffer.length + 1 > this._buffer.length - this._write){
    throw new Error("write string overflow");
  }
  
  stringBuffer.copy(this._buffer, this._write);
  
  this._buffer[this._write + stringBuffer.length] = 0;
  this._write += stringBuffer.length;
};

PacketEncoder.prototype.writeByte = function(value){
  
  if(this._write == this._buffer.length){
    throw new Error("write int overflow");
  }
  
  this._buffer[this._write] = value;
  this._write += 1;
};

PacketEncoder.prototype._put = function(){
    var argc = arguments.length;
    for(var i = 0; i < argc; i++){
      this.writeByte(arguments[i]);
    }
};

PacketEncoder.prototype.writeInt = function(value){
  
  value = parseInt(value, 10);
  
  if(value < 128 && value > -127){
    this._put(value);
  }
  else if(value < 0x8000 && value >= -0x8000){
    this._put(0x80, value & 0xFF, (value >> 8) & 0xFF);
  }
  else{
    this._put(0x81, value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF);
  }
};

PacketEncoder.prototype.writeUInt = function(value){
  
  value = parseInt(value, 10);
  
  if(value < -0x10000000 || value > 0xFFFFFFF){
    throw new Error("cannot write unsigned int outside of range -268435456 to 268435455");
  }
  
  if(value < 0 || value >= 0x200000){
    this._put(
      0x80 | (value & 0x7F),
      0x80 | ((value >> 7) & 0x7F),
      0x80 | ((value >> 14) & 0x7F),
      value >> 21
    );
  }
  else if(value < 128){
    this._put(value);
  }
  else if(value < 0x4000){
    this._put(0x80 | (value & 0x7F), value >> 7);
  }
  else{
    this._put(
      0x80 | (value & 0x7F),
      0x80 | ((value >> 7) & 0x7F),
      value >> 14
    );
  }
};

PacketEncoder.prototype.writeFloat = function(value){
  
  if(this._write + 4 > this._buffer.length){
    throw new Error("write float overflow");
  }
  
  this._buffer.writeFloatLE(value, this._write);
  this._write += 4;
};

PacketEncoder.prototype.getWrittenSlice = function(){
  return this._buffer.slice(0, this._write);
};

function PacketDecoder(buffer){
  this._buffer = buffer;
  this._read = 0;
}

PacketDecoder.prototype.bytesRemaining = function(){
  return this._buffer.length - this._read;
};

PacketDecoder.prototype._readable = function(bytes){
  if(this._read + bytes > this._buffer.length){
    throw new Error("read overflow");
  }
};

PacketDecoder.prototype._readByte = function(){
  this._readable(1);
  var byte = this._buffer[this._read];
  this._read += 1;
  return byte;
};

PacketDecoder.prototype._readInt8 = function(){
  this._readable(1);
  var byte = this._buffer.readInt8(this._read);
  this._read += 1;
  return byte;
};

PacketDecoder.prototype._readInt16 = function(){
  this._readable(2);
  var short = this._buffer.readInt16LE(this._read);
  this._read += 2;
  return short;
};

PacketDecoder.prototype._readInt32 = function(){
  this._readable(4);
  var short = this._buffer.readInt32LE(this._read);
  this._read += 4;
  return short;
};

PacketDecoder.prototype.readString = function(){
  
  var result = "";
  var terminated = false;
  
  while(!terminated && this._read < this._buffer.length){
    
    var charCode = this._readByte();
    
    if(charCode > 0){
      result += String.fromCharCode(charCode);
    }
    else terminated = true;
  }
  
  return result;
};

PacketDecoder.prototype.readUInt8 = function(){
  return this._readByte();
};

PacketDecoder.prototype.readInt = function(){
  
  var n = this._readInt8();
  
  if(n == -128){
    return this._readInt16();
  }
  else if(n == -127){
    return this._readInt32();
  }
  else return n;
};

PacketDecoder.prototype.readUInt = function(){
  
  var n = this._readByte();
  
  if(n & 0x80){
    n += (this._readByte() << 7) - 0x80;
    if(n & 0x4000) n += (this._readByte() << 14) - 0x4000;
    if(n & 0x200000) n += (this._readByte() << 21) - 0x200000;
    if(n & 0x10000000) n |= 0xF0000000;
  }
  
  return n;
};

PacketDecoder.prototype.readFloat = function(){
  this._readable(4);
  var value = this._buffer.readFloatLE(this._read);
  this._read += 4;
  return value;
};

exports.PacketEncoder = PacketEncoder;
exports.PacketDecoder = PacketDecoder;
