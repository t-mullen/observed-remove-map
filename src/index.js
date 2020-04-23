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

  self.site = site
  self._counter = 0
  self._set = new OrSet(site, opts)

  self._set.on('op', (op) => self.emit('op', op))
  self._set.on('add', self._onRemoteAdd.bind(self))
  self._set.on('delete', self._onRemoteDelete.bind(self))

  if (opts.state) {
    self.setState(opts.state)
  }
}

OrMap.prototype.setState = function (state) {
  var self = this
  self._set.setState(state)
}

OrMap.prototype.getState = function () {
  var self = this
  return self._set.getState()
}

OrMap.prototype.receive = function (op) {
  var self = this

  self._set.receive(op)
}

OrMap.prototype._onRemoteAdd = function ({ key, value }) {
  var self = this

  // add fires once per add or set
  var matches = self._set.values().filter(x => x.key === key)
  if (matches.length === 1) self.emit('add', key)

  var getValue = self.get(key) // the actual value (conflicts resolved by site ID)
  if (value === getValue) self.emit('set', key, value)
}

OrMap.prototype._onRemoteDelete = function ({ key, value, uuid }) {
  var self = this

  var count = self._set.values().filter(x => x.key === key).length
  if (count === 0) self.emit('delete', key)
}

OrMap.prototype.add = function (key) {
  var self = this

  self.set(key, null)
}

OrMap.prototype.set = function (key, value) {
  var self = this

  var oldValues = self._set.values()

  // create a new relation element
  self._set.add({ key, value, site: self.site, counter: ++self._counter })

  // remove all other relations with the given key
  oldValues.forEach((r) => {
    if (r.key === key) self._set.delete(r)
  })
}

OrMap.prototype._getKeyMatches = function (key) {
  var self = this
  // find any relation with a key
  return self._set.values().filter((r) => {
    return r.key === key
  })
}

OrMap.prototype.has = function (key) {
  var self = this
  return self._getKeyMatches(key).length !== 0
}

OrMap.prototype.get = function (key) {
  var self = this

  // find any relation with a key
  var matches = self._getKeyMatches(key)
  if (matches.length === 0) return undefined

  if (matches.length > 1) {
    return matches.sort((a, b) => {
      return a.site < b.site ? -1 : 1
    })[0].value
  } else {
    return matches[0].value
  }
}

OrMap.prototype.delete = function (key) {
  var self = this

  // remove all existing relations with the given key
  self._set.values().forEach((r) => {
    if (r.key === key) self._set.delete(r)
  })
}

OrMap.prototype.keys = function () {
  var self = this

  return self._set.values()
    .map(relation => relation.key)
    .filter((r, i, self) => self.indexOf(r) === i) // filter duplicate keys
}

OrMap.prototype.values = function () {
  var self = this

  return self.keys().map(key => self.get(key))
}

OrMap.prototype.toObject = function () {
  var self = this

  var obj = {}

  self.keys().forEach(key => {
    obj[key] = self.get(key)
  })

  return obj
}

OrMap.prototype.toString = function () {
  var self = this

  return self._serialize(self.toObject())
}

module.exports = OrMap
