var test = require('tape')
var OrMap = require('./../')

test('test toString', function (t) {
  var map1 = OrMap('1')
  map1.add('a')
  map1.set('b', 1)
  map1.set('c', 'd')

  var shouldBe = {
    a: null,
    b: 1,
    c: 'd'
  }

  t.equals(map1.toString(), JSON.stringify(shouldBe))
  t.end()
})

test('test values', function (t) {
  var map1 = OrMap('1')
  map1.add('a')
  map1.set('b', 1)
  map1.set('c', 'd')

  t.deepEqual(map1.values(), [null, 1, 'd'])
  t.end()
})

test('test add', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  map1.on('op', op => map2.receive(op))
  map2.on('op', op => map1.receive(op))

  map1.on('add', (key) => console.log('add', key))
  map1.on('set', (key, value) => console.log('set', key, value))
  map1.on('delete', (key) => console.log('delete', key))

  map1.add('a')
  map2.add('b')
  map1.add('b')

  t.assert(map1.keys().indexOf('a') !== -1, 'a in map1')
  t.assert(map2.keys().indexOf('a') !== -1, 'a in map2')

  t.assert(map1.keys().indexOf('b') !== -1, 'b in map1')
  t.assert(map2.keys().indexOf('b') !== -1, 'b in map2')

  t.equals(map1.get('a'), map2.get('a'), 'values are equal')
  t.equals(map1.get('b'), map2.get('b'), 'values are equal')

  t.equals(map1.keys().length, 2)
  t.equals(map2.keys().length, 2)
  t.end()
})

test('test repeat set', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  map1.on('op', op => map2.receive(op))
  map2.on('op', op => map1.receive(op))

  map2.once('set', (key, value) => {
    t.equals(key, 'a')
    t.equals(value, 1)
    map2.once('set', (key, value) => {
      t.equals(key, 'a')
      t.equals(value, 2)
    })
  })

  map1.set('a', 1)
  map1.set('a', 2)

  t.assert(map1.keys().indexOf('a') !== -1, 'a in map1')
  t.assert(map2.keys().indexOf('a') !== -1, 'a in map2')

  t.equals(map1.get('a'), map2.get('a'), 'values are equal')

  t.equals(map1.keys().length, 1)
  t.end()
})

test('test add/delete', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  map1.on('op', op => map2.receive(op))
  map2.on('op', op => map1.receive(op))

  map1.add('a')
  map2.add('b')
  map1.add('b')
  map1.delete('b')

  t.assert(map1.keys().indexOf('a') !== -1, 'a in map1')
  t.assert(map2.keys().indexOf('a') !== -1, 'a in map2')

  t.assert(map1.keys().indexOf('b') === -1, 'b NOT in map1')
  t.assert(map2.keys().indexOf('b') === -1, 'b NOT in map2')

  t.equals(map1.get('a'), map2.get('a'), 'values are equal')
  t.equals(map1.get('b'), map2.get('b'), 'values are equal')

  t.equals(map1.keys().length, 1)
  t.equals(map2.keys().length, 1)
  t.end()
})

test('test add/set/delete', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  map1.on('op', op => map2.receive(op))
  map2.on('op', op => map1.receive(op))

  map1.add('a')
  map1.set('a', 2)
  map2.set('b', 'bee')
  map1.delete('b')
  map1.delete('x') // non-existent key

  t.assert(map1.keys().indexOf('a') !== -1, 'a in map1')
  t.assert(map2.keys().indexOf('a') !== -1, 'a in map2')
  t.equals(map2.get('a'), 2, 'a is correct value')

  t.assert(map1.keys().indexOf('b') === -1, 'b NOT in map1')
  t.assert(map2.keys().indexOf('b') === -1, 'b NOT in map2')
  t.equal(map1.get('b'), undefined, 'b is undefined')
  t.equals(map2.get('b'), undefined, 'b is undefined')

  t.equals(map1.get('a'), map2.get('a'), 'values are equal')
  t.equals(map1.get('b'), map2.get('b'), 'values are equal')

  t.equals(map1.keys().length, 1)
  t.equals(map2.keys().length, 1)
  t.end()
})

test('test concurrent delete/delete', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  var op1 = []
  var op2 = []

  map1.on('op', op => {
    op1.push(op)
  })
  map2.on('op', op => {
    op2.push(op)
  })

  map1.add('a')
  map2.receive(op1.shift())

  map1.delete('a')
  map2.delete('a')
  map1.receive(op2.shift())
  map2.receive(op1.shift())

  t.assert(map1.keys().indexOf('a') === -1, 'a NOT in map1')
  t.assert(map2.keys().indexOf('a') === -1, 'a NOT in map2')

  t.equals(map1.get('a'), map2.get('a'), 'values are equal')

  t.equals(map1.keys().length, 0)
  t.equals(map2.keys().length, 0)
  t.end()
})

test('test concurrent set/delete', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  var op1 = []
  var op2 = []

  map1.on('op', op => {
    op1.push(op)
  })
  map2.on('op', op => {
    op2.push(op)
  })

  map1.set('a', 0)
  while (op1[0]) map2.receive(op1.shift())

  map1.set('a', 1)
  map2.delete('a')
  while (op2[0]) map1.receive(op2.shift())
  while (op1[0]) map2.receive(op1.shift())

  t.assert(map1.keys().indexOf('a') !== -1, 'a in map1')
  t.assert(map2.keys().indexOf('a') !== -1, 'a in map2')

  t.equals(map1.get('a'), map2.get('a'), 'values are equal')

  t.equals(map1.keys().length, 1)
  t.equals(map2.keys().length, 1)
  t.end()
})

test('test out-of-order delivery', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  var op1 = []
  var op2 = []

  map1.on('op', op => {
    op1.push(op)
  })
  map2.on('op', op => {
    op2.push(op)
  })

  map1.set('a', 0)
  map1.set('a', 1)
  map2.delete('a')
  map1.set('b', 1)
  map1.delete('b')
  map1.delete('b')

  while (op2[0]) map1.receive(op2.pop()) // out-of-order
  while (op1[0]) map2.receive(op1.pop())

  t.deepEquals(map1.toObject(), map2.toObject())
  t.end()
})


test('test more-than-once delivery', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  var op1 = []
  var op2 = []

  map1.on('op', op => {
    op1.push(op)
  })
  map2.on('op', op => {
    op2.push(op)
  })

  map1.set('a', 0)
  map1.set('a', 1)
  map2.delete('a')
  map1.set('b', 1)
  map1.delete('b')
  map1.delete('b')

  while (op2[0]) {
    for (var i = 0; i < 5; i++) {
      map1.receive(op2[0])
    }
    op2.shift()
  }
  while (op1[0]) {
    for (var i = 0; i < 5; i++) {
      map2.receive(op1[0])
    }
    op1.shift()
  }

  t.deepEquals(map1.toObject(), map2.toObject())
  t.end()
})

test('test concurrent set/set', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  var op1 = []
  var op2 = []

  map1.on('op', op => {
    op1.push(op)
  })
  map2.on('op', op => {
    op2.push(op)
  })

  map1.set('a', 0)
  while (op1[0]) map2.receive(op1.shift())

  map1.set('a', 1)
  map2.set('a', 2)
  while (op2[0]) map1.receive(op2.shift())
  while (op1[0]) map2.receive(op1.shift())

  t.assert(map1.keys().indexOf('a') !== -1, 'a in map1')
  t.assert(map2.keys().indexOf('a') !== -1, 'a in map2')

  t.assert(map1.has('a') && map2.has('a'), 'values are present')
  t.equals(map1.get('a'), map2.get('a'), 'values are equal')

  t.equals(map1.keys().length, 1)
  t.equals(map2.keys().length, 1)
  t.deepEquals(map1.toObject(), map2.toObject())
  t.end()
})

test('test concurrent add/delete', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  var op1 = []
  var op2 = []

  map1.on('op', op => {
    op1.push(op)
  })
  map2.on('op', op => {
    op2.push(op)
  })

  map1.add('a')
  map2.receive(op1.shift())

  map1.add('a') // re-adding a
  map2.delete('a')
  while (op2[0]) map1.receive(op2.shift())
  while (op1[0]) map2.receive(op1.shift())

  // Add wins
  t.assert(map1.keys().indexOf('a') !== -1, 'a in map1')
  t.assert(map2.keys().indexOf('a') !== -1, 'a in map2')

  t.deepEqual(map1.toObject(), map2.toObject())
  t.end()
})

test('test concurrent early delete (add not received)', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')
  var map3 = OrMap('3')

  var op1 = []
  var op2 = []
  var op3 = []

  map1.on('op', op => op1.push(op))
  map2.on('op', op => op2.push(op))

  map1.add('a')             // 1 adds
  map2.receive(op1[0])      // 2 receives add
  map2.delete('a')          // 2 deletes
  map3.receive(op2[0])      // 3 receives delete before add
  map3.receive(op1[0])      // 3 finally receives add (and integrates past delete via tombstone)
  map1.receive(op2[0])      // 1 receives delete

  t.assert(map1.keys().indexOf('a') === -1, 'a NOT in map1')
  t.assert(map2.keys().indexOf('a') === -1, 'a NOT in map2')
  t.assert(map3.keys().indexOf('a') === -1, 'a NOT in map3')

  t.equals(map1.keys().length, 0)
  t.equals(map2.keys().length, 0)
  t.equals(map3.keys().length, 0)
  t.end()
})

test('test state transfer', function (t) {
  var map1 = OrMap('1')
  var map2 = OrMap('2')

  map1.on('op', op => map2.receive(op))
  map2.on('op', op => map1.receive(op))

  map1.add('a')
  map1.add('b')
  map1.delete('b')

  map2.add('a')
  map2.delete('a')
  map2.add('d')

  var map3 = OrMap('3', { state: map1.getState() })
  t.deepEquals(map1.toObject(), map3.toObject())

  map3.on('op', op => map2.receive(op))
  map3.on('op', op => map1.receive(op))
  map2.on('op', op => map3.receive(op))
  map1.on('op', op => map3.receive(op))

  map3.set('g', 2)

  map1.set('x', 0)
  map2.set('x', 4)
  map3.set('x', 1)

  t.deepEquals(map2.toObject(), map3.toObject())
  t.deepEquals(map2.toObject(), map1.toObject())

  t.end()
})

test('test random operations and delays', function (t) {
  var maps = [OrMap('1'), OrMap('2'), OrMap('3')]
  var ops = [[], [], []]

  var waiting = 0

  function afterRandomDelay(cb) {
    setTimeout(cb, Math.random() * 3000) // 0-5 seconds
  }

  // pushes to queue, then after a random time, takes the top off the queue
  // like all CRDTs, relatively causality between sites needs to be preserved
  for (var s = 0; s < 3; s++) {
    ; ((s) => {
      maps[s].on('op', op => {
        var repeats = 1 + Math.floor(Math.random() * 3)
        for (var i = 0; i < repeats; i++) { // more-than-once
          ops[s].push(op)
          waiting++

          afterRandomDelay(() => {
            var rnd = Math.floor(ops[s].length * Math.random())
            var opn = ops[s].splice(rnd, 1)[0] // out of order
            for (var s2 = 0; s2 < 3; s2++) {
              if (s2 == s) continue
              maps[s2].receive(opn)
            }
            waiting--
            checkIfDone()
          })
        }
      })
    })(s)
  }

  for (var i = 0; i < 300; i++) {
    var site = Math.floor(Math.random() * 3)
    var op = ['add', 'delete', 'set'][Math.floor(Math.random() * 2)]
    var value = Math.random()

    maps[site][op](value)
  }

  function checkIfDone() {
    if (waiting > 0) return

    maps.forEach((s1, i1) => {
      maps.forEach((s2, i2) => {
        if (i1 === i2) return
        s1.keys().forEach((key) => {
          t.assert(s2.keys().indexOf(key) !== -1, 'key is contained in other map')
          t.equal(s2.get(key), s1.get(key), 'key-value pairing is the same')
        })
        s1.values().forEach((value) => {
          t.assert(s2.values().indexOf(value) !== -1, 'value is contained in other map')
        })
      })
    })

    t.end()
  }
})
