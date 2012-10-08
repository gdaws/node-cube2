assert = require "assert"
Document = require "../lib/utils/document"

describe "Document", ->

  document = new Document
  
  beforeEach ->
    document.removeAllListeners()
    document.clear()
  
  it "should set and get an attribute", ->
  
    document.set "a", 1
    assert.equal document.get("a"), 1
  
  it "should clear", ->
    
    document.set "a", 1
    document.clear()
    assert.equal document.has("a"), false
  
  it "should set a group of attributes", ->
    
    document.set
      a: 2
      b: 3
      c: 4
    
    assert.equal document.get("a"), 2
    assert.equal document.get("b"), 3
    assert.equal document.get("c"), 4
  
  it "should put attributes", ->
    
    document.set
      a: 1
      b: 2
      c: 3
      
    document.put
      b: 3
      d: 4
      
    assert.equal document.has("a"), false
    assert.equal document.get("b"), 3
    assert.equal document.has("c"), false
    assert.equal document.get("d"), 4

  it "should unset attribute", ->
    
    document.set "a", 1
    document.unset "a"
    
    assert.equal document.has("a"), false
  
  it "should return all attributes", ->
  
    document.set "a", 1
    document.set "b", 2
    
    assert.deepEqual document.attributes(), {a: 1, b:2}
  
  it "should emit add event", (done) ->
    
    count = 0
    
    document.on "add", (key) ->
      count++
      assert.equal key == "a" or key == "b", true
      done() if count == 2
    
    document.set
      a: 1
      b: 2
  
  it "should emit add:* event", (done) ->
    
    count = 0
    
    document.on "add:a", ->
      count++
      done() if count == 2
    
    document.on "add:b", ->
      count++
      done() if count == 2
      
    document.set
      a: 1
      b: 2
  
  it "should emit remove event", (done) ->
  
    count = 0
    
    document.on "remove", (key) ->
      count++
      assert.equal key == "a" or key == "b", true
      done() if count == 2
    
    document.set
      a: 1
      b: 2
      
    document.put {}
  
  it "should emit remove:* event", (done) ->
  
    count = 0
    
    document.on "remove:a", ->
      count++
      done() if count == 2
      
    document.on "remove:b", ->
      count++
      done() if count == 2
    
    document.set
      a: 1
      b: 2
    
    document.put {}

  it "should emit clear event", (done) ->
  
    document.on "clear", ->
      done()
      
    document.set
      a:1
    
    document.clear()
    
  it "should emit change event when adding attributes", (done) ->
    
    document.on "change", (oldValues) ->
      assert.equal oldValues.a, undefined
      assert.equal oldValues.b, undefined
      assert.equal document.get("a"), 1
      assert.equal document.get("b"), 2
      done()
    
    document.set
      a: 1
      b: 2
    
  it "should emit change event for existing attributes", (done) ->
        
    document.set
      a: 1
      b: 2
    
    document.on "change", (oldValues) ->
    
      assert.equal oldValues.a, 1
      assert.equal oldValues.b, 2
      assert.equal document.get("a"), 3
      assert.equal document.get("b"), 4
      done()
      
    document.set
      a: 3
      b: 4
  
  it "should emit change event for removed attributes", (done) ->
    
    document.set
      a:1
      b:2
      
    document.on "change", (oldValues) ->
    
      assert.equal oldValues.a, 1
      assert.equal oldValues.b, 2
      assert.equal document.has("a"), false
      assert.equal document.has("b"), false
      done()
    
    document.clear()
  
  it "should emit change:a event", (done) ->
    
    document.set
      a: 1
      b: 2
    
    document.on "change:a", (newValue, oldValue) ->
      assert.equal newValue, 3
      assert.equal oldValue, 1
      assert.equal document.get("a"), 3
      done()
    
    document.set
      a: 3
      b: 4
  