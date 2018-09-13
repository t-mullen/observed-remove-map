# observed-remove-map

An "Observed-Remove Map" or "OR-Map", is a Map data type that can be modified concurrently and will eventually reach the same state everywhere (it is "eventually consistent").

Built with [observed-remove-set](https://github.com/RationalCoding/observed-remove-set).

## example

```javascript
var map1 = new OrMap('bob')
var map2 = new OrMap('alice')

// let's provide a "delay" function to simulate concurrency on a network
function delay (cb) {
  setTimeout(cb, 3000) // 3 seconds of delay!
}

// let's "connect" our two maps
map1.on('op', op => delay(() => map2.receive(op)))
map2.on('op', op => delay(() => map1.receive(op)))

// both Bob and Alice simulatenously set "a" to different values
map1.set('a', 0) // {a:0}
map2.set('a', 1) // {a:1}
```

In a normal Map type, this would cause a conflict! However, these are Or-Maps and will handle conflicts for us. Once all operations have been delivered, both Bob and Alice are guaranteed to have the same data.


```javascript
// after all operations have been received...
map1.get('a') // 0
map2.get('a') // 0
```

## install

```
npm install observed-remove-map
```

```html
<script src="dist/or-map.js"></script>
```

## api

### `orMap = new OrMap(uuid)`

Create a new OR-Map.

Required `uuid` is some universally unique identifer for this map.

### `orMap.add(key)`

Add a key to the map with a value of `null`.

`element` is any serializable Javascript object. Changes to within this object will NOT be replicated.

### `orMap.delete(key)`

Remove a key and it's value from the map.

### `orMap.set(key, value)`

Sets the value at `key`. If `key` does not exist, it will be added first.

### `orMap.get(key)`

Returns the value associated with the given `key`.

### `orMap.keys()`

Returns an array with all keys.

### `orMap.values()`

Returns an array with all values.

### `orMap.receive(op)`

Receive an operation from a remote map. Must be called exactly once per remote operation.

### `orMap.on('op', function (op) {})`

Fires when an operation needs to be sent to connected Maps. Operations can be delivered in any order and more-than-once, but must be delivered at-least-once. There may be multiple operation events for each call to a method.

`op` is the operation object that needs to be passed into `otherOrMap.receive(op)` for all other replicas.

### `orMap.on('add', function (key) {})`

Fires when a new key is added to the map by a *remote* operation. (will **not** fire when `orMap.add()` is called locally.)

### `orMap.on('delete', function (key, value) {})`

Fires when a key is removed from the map by a *remote* operation. (will **not** fire when `orMap.delete()` is called locally.)

### `orMap.on('set', function (key, value) {})`

Fires when the value associated with a key is changed by a *remote* operation. (will **not** fire when `orMap.set()` is called locally.)

