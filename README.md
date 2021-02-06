# Green/Red Cache

Caches a promise of an async function for "green" and "red" periods.

A caller calls the cache. If the cache is empty or expired - calls the async function, then stores and returns the _promise_ to the caller.

Subsequen calls to the cache:

- During the _green_ period: returns the promise to callers from the cache.
- During the _red_ period: still returns the promise from cache but initiates a parallel cache update promise.

## Init the cache

```js
const CacheControl = require("green-red-cache");
const cache = new CacheControl(
	async (key) => {
		return await retrieveValueFromBackend(key)
	},
	{
		green_period: 60000, // cache is considered to be "green" during 1 min. Default is 15000
        red_period: 360000 // cache is still valid during 1 hour, but a separate parallel promise to be created to update the cache. Default is 15000
        timeout: 30000 // async function should complete in 30 sec. otherwise - timeout exception. No timeout used by default.
	}
)
```

## Retrieve the value

```js
const value = await cache.get('my_key')
```

or

```js
const value = cache.getgreen('my_key') || (await cache.get('my_key'))
```

## Invalidate cache

```js
cache.cancel('my_key')
```

## catching errors during parallel updates

```js
cache.on('fail', (key, error) => {
	console.log(`Failed to retrieve value of the ${key}`)
	console.log(error)
})
```
