var EventEmitter = require('nanobus')
var inherits = require('inherits')
var OrSet = require('observed-remove-set')

inherits(OrMap, EventEmitter)

function OrMap (site, opts) {
  var self = this
  if (!(self instanceof OrMap)) return new OrMap(site, opts)

  EventEmitter.call(self)

  opts = opts || {}

  self._serialize = opts.serialize || JSON.stringify
  self._parse = opts.parse || JSON.parse

  self._site = site
  self._counter = 0

  self._set = new OrSet(site, opts)

  self._set.on('op', (op) => {
    self.emit('op', op)
  })
  self._set.on('add', self._onRemoteAdd.bind(self))
  self._set.on('delete', self._onRemoteDelete.bind(self))

  self._mappings = {} // just a faster way to do lookups on the set
}

OrMap.prototype._unique = function () {
  var self = this

  return [self._site, self._counter++]
}

OrMap.prototype.receive = function (op) {
  var self = this

  self._set.receive(op)
}

OrMap.prototype._onRemoteAdd = function (e) {
  var self = this

  // add fires once per add or set

  var key = e[0]
  var value = e[1]
  var uuid = e[2]

  if (!self._mappings[key]) {
    self._mappings[key] = [[value, uuid]]
    self.emit('add', key)
  } else {
    self._mappings[key].push([value, uuid])
  }

  self.emit('set', key, value)
}

OrMap.prototype._onRemoteDelete = function (e) {
  var self = this

  // delete can fire multiple times per add, set or delete

  var key = e[0]
  var uuid = e[2]
  var value = self.get(key)

  // remove deleted element
  var index = self._mappings[key].findIndex(m => {
    if (m[1][0] === uuid[0] && m[1][1] === uuid[1]) return true
  })
  self._mappings[key].splice(index, 1)

  if (self._mappings[key].length === 0) {
    delete self._mappings[key]
    self.emit('delete', key, value)
  }
}

OrMap.prototype.add = function (key) {
  var self = this

  self.set(key, null)
}

OrMap.prototype.set = function (key, value) {
  var self = this

  if (!self._mappings[key]) self._mappings[key] = []

  // remove all existing mappings and elements with key
  self._mappings[key].forEach((m) => {
    self._set.delete([key, m[0], m[1]])
  })

  // create a new mapping and element
  var uuid = self._unique()
  self._mappings[key] = [[value, uuid]]
  self._set.add([key, value, uuid])
}

OrMap.prototype.get = function (key) {
  var self = this

  if (!self._mappings[key]) return null

  // return the value of mapping with the highest uuid (conflict resolution)
  return self._mappings[key].reduce(function (prev, current) {
    return (prev[1] > current[1]) ? prev : current
  })[0]
}

OrMap.prototype.delete = function (key) {
  var self = this

  if (!self._mappings[key]) return

  // remove all existing mappings and elements with key
  self._mappings[key].forEach((m) => {
    self._set.delete([key, m[0], m[1]])
  })
  delete self._mappings[key]
}

OrMap.prototype.keys = function () {
  var self = this

  return Object.keys(self._mappings)
}

OrMap.prototype.values = function () {
  var self = this

  return Object.keys(self._mappings).map(key => {
    return self.get(key)
  })
}

OrMap.prototype.toObject = function () {
  var self = this

  var obj = {}

  Object.keys(self._mappings).forEach(key => {
    obj[key] = self.get(key)
  })

  return obj
}

OrMap.prototype.toString = function (encoding) {
  var self = this

  return self._serialize(self.toObject())
}

module.exports = OrMap
