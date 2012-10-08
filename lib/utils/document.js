var sys = require("util");
var events = require("events");
var _ = require("underscore");

function Document(){
  events.EventEmitter.call(this);
  this._attrs = {};
  this._created_at = new Date();
  this._changed_at = null;
}

sys.inherits(Document, events.EventEmitter);

Document.prototype.attributes = function(){
  return this._attrs;
};

Document.prototype.get = function(key){
  return this._attrs[key];
};

Document.prototype.set = function(newData){
  
  var key; // reusable variable
  
  if(arguments.length == 2 && typeof arguments[0] == "string"){
    key = arguments[0];
    newData = {};
    newData[key] = arguments[1];
  }
  
  var changes = 0;
  var changedData = {};
  var currentData = this._attrs;
  
  var newValue;
  
  for(key in newData){
    if(currentData[key] !== newData[key]){
      
      changedData[key] = currentData[key];
      
      newValue = newData[key];
      
      if(newValue !== undefined){
        currentData[key] = newData[key];
      }
      else{
        delete currentData[key];
      }
      
      changes++;
    }
  }
  
  if(changes > 0){
    
    this._changed_at = new Date();
    
    for(key in changedData){
      
      var oldValue = changedData[key];
      newValue = currentData[key];
      
      if(oldValue === undefined){
        this.emit("add:" + key);
        this.emit("add", key);
      }
      
      if(newValue === undefined){
        this.emit("remove:" + key);
        this.emit("remove", key);
      }
      
      this.emit("change:" + key, newValue, oldValue);
    }
    
    this.emit("change", changedData);
    
    if(_.isEmpty(this._attrs)){
      this.emit("clear");
    }
  }
  
  return changes;
};

Document.prototype.has = function(key){
  return this.get(key) !== undefined;
};

Document.prototype.put = function(data){
  
  // Remove missing properties from the current attribute set
  this.set(makeEmptyObject(_.difference(_.keys(this._attrs), _.keys(data))));
  
  this.set(data);
};

Document.prototype.unset = function(key){
  this.set(makeEmptyObject([key]));
};

Document.prototype.clear = function(){
  this.put({});
};

function makeEmptyObject(keys){
  var empty = {};
  var numKeys = keys.length;
  for(var i = 0; i < numKeys; i++){
    empty[keys[i]] = undefined;
  }
  return empty;
}

module.exports = Document;
