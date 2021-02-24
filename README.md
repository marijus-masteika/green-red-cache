# Green/Red Cache

Caches a return of an async function for "green" and "red" periods.

- **Cache miss**: calls the async function, then caches and returns the _promise_.
- **Green period**: returns a cached promise of the async function or its resolved value.
- **Red period**: same as during the _green_ period, plus initiates a separate thread to update the cache.

## Construct the cache

```js
const CacheControl = require('green-red-cache')
const cache = new CacheControl(async (key) => {
	return await retrieveValueFromBackend(key)
}, options)
```

### options

Type: `object`\
Optional: `true`

Optional cache initialization parameters.

#### green_period

Type: `number`\
Optional: `true`\
Default: `15000`

How many milliseconds a value in the cache to be considered _green_.

#### red_period

Type: `number`\
Optional: `true`\
Default: `15000`

How many milliseconds a value in the cache to be considered _red_.

#### timeout

Type: `number`\
Optional: `true`\
Default: undefined

How many milliseconds the async function has to complete before timeout exception raised.

## Getting value

```js
const value = await cache.get('my_key')
```

## Try getting value without _await_

```js
const value = cache.getgreen('my_key') || (await cache.get('my_key'))
```

## Invalidate a cache entry

```js
cache.clear('my_key')
```

## Force an update of a cache entry

```js
cache.update('my_key')
```

## Remove garbage from the cache

```js
setInterval(() => {
	for (const key of cache.garbage()) cache.clear(key)
}, 3600000)
```

## Keep cache hot

```js
setInterval(() => {
	for (const key of cache.passing()) cache.get(key)
}, 60000)
```

## Handle parallel cache update errors

```js
cache.on('fail', (key, error) => {
	console.log(`Failed to retrieve value of the ${key}`)
	console.log(error)
})
```
