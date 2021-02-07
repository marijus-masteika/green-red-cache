const assert = require('assert');

const cc = require("../index");

async function timeout(t, msg, err) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (err) reject(msg);
            else resolve(msg);
        }, t);
    });
}

describe('cache tests', async () => {

    it("#get() with timeout", async function () {

        const cache = new cc(async key => timeout(1000, 0), {
            green_period: 0,
            red_period: 2000,
            timeout: 500
        });

        this.timeout(10000);
        let error = false;
        cache.on("fail", (key, err) => {
            error = true;
        });
        try {
            await cache.get("x");
        } catch (err) { }
        await timeout(100);
        assert.strictEqual(error, true);
        assert.deepStrictEqual(cache.cache.x, {
            key: 'x'
        });
    });

    it("#get()", async function () {

        const cache = new cc(async key => Promise.resolve(0), {
            timeout: 1000
        });

        try {
            rez = await cache.get("x");
            assert.strictEqual(rez, 0);
        } catch (err) {
            throw new Error("should not fail");
        }
        await timeout(100);
        assert.deepStrictEqual(cache.cache.x, {
            key: 'x',
            value: 0,
            time: cache.cache.x.time
        });
    });

    it("Using A", async function () {

        let cnt = 0;
        const cache = new cc(async key => {
            await timeout(1000);
            cnt++;
            if (cnt > 2) {
                return Promise.reject("failure, cnt:" + cnt);
            } else {
                return Promise.resolve(cnt);
            }
        }, {
            green_period: 2500,
            red_period: 1000
        });

        this.timeout(30000);

        let rez;

        rez = await cache.get("x");
        assert.strictEqual(rez, 1);

        await timeout(1000);
        rez = await cache.get("x");
        assert.strictEqual(rez, 1);

        await timeout(1000);
        rez = await cache.get("x");
        assert.strictEqual(rez, 1);

        await timeout(1000);
        rez = await cache.get("x");
        assert.strictEqual(rez, 1);

        await timeout(1000);
        rez = await cache.get("x");
        assert.strictEqual(rez, 2);

        await timeout(1000);
        rez = await cache.get("x");
        assert.strictEqual(rez, 2);

        await timeout(1000);
        rez = await cache.get("x");
        assert.strictEqual(rez, 2);

        await timeout(1000);
        rez = await cache.get("x");
        assert.strictEqual(rez, 2);


    });

    it("#fail and then succeed", async function () {

        let cnt = 0;
        const cache = new cc(async key => {
            cnt++;
            if (cnt === 1) return Promise.reject("first time it should fail");
            else return Promise.resolve(0);
        });

        try {
            rez = await cache.get("x");
        } catch (err) {

        }
        await timeout(100);

        try {
            rez = await cache.get("x");
            assert.strictEqual(rez, 0);
        } catch (err) {
            throw new Error("should not fail");
        }

        assert.deepStrictEqual(cache.cache.x, {
            key: 'x',
            value: 0,
            time: cache.cache.x.time
        });
    });

    it("#garbage collection", async function () {

        const cache = new cc(async key => {
            await timeout(10);
            return Promise.resolve("ok");
        }, {
            green_period: 100,
            red_period: 100
        });

        cache.get("a");
        cache.update("b");
        cache.cache.d = {
            key: "d"
        };

        await timeout(300);

        cache.get("c");

        let keys = [...cache.garbage()];
        assert.strictEqual(keys.length, 3);
        assert.deepStrictEqual(keys, ["a", "b", "d"]);

        for (const key of cache.garbage()) {
            if (key === "a") cache.update(key);
            if (key === "b") {
                cache.update("b");
                cache.clear("b");
            }
        }

        keys = [...cache.garbage()];
        assert.deepStrictEqual(keys, ["d"]);
    });

    it("#preheating", async function () {

        const cache = new cc(async key => {
            await timeout(10);
            return Promise.resolve("ok");
        }, {
            green_period: 100,
            red_period: 1000
        });

        cache.get("a");
        cache.get("b");

        await timeout(200);

        cache.get("c");

        let keys = [...cache.passing()];
        assert.strictEqual(keys.length, 2);
        assert.deepStrictEqual(keys, ["a", "b"]);
    });


    it("#0 is a valid value", async function () {

        const cache = new cc(async key => {
            return Promise.resolve(0);
        });
        const rez = await cache.get(0);
        assert.strictEqual(rez, 0);
        assert(cache.value_is_green(0));
    });


    describe("#getgreen()", async () => {
        let cache;
        before(async function () {
            cache = new cc(async key => timeout(100, "ok"), {
                green_period: 1000,
                red_period: 0,
                timeout: 1000
            });
        });
        it("no entry, shall return false", async function () {
            assert.strictEqual(cache.getgreen("x"), false);
        });
        it("entry created, shall return value", async function () {
            await cache.get("x");
            assert.strictEqual(cache.getgreen("x"), "ok");
        });
        it("entry expired, shall return false", async function () {
            this.timeout(10000);
            await timeout(2000);
            assert.strictEqual(cache.getgreen("x"), false);
        });
    });

    describe("#cancel()", async () => {
        let cache;
        let cnt = 1;
        before(async function () {
            cache = new cc(async key => {
                return timeout(100, cnt++);
            });
        });
        it("no effect on cache", async function () {
            assert.strictEqual(cache.getgreen("x"), false);
            cache.clear("x");
            assert.strictEqual(cache.getgreen("x"), false);
        });
        it("shall return new value", async function () {
            assert.strictEqual(await cache.get("x"), 1);
        });
        it("shall return from cache", async function () {
            assert.strictEqual(await cache.getgreen("x"), 1);
            assert.strictEqual(await cache.get("x"), 1);
        });
        it("shall return new value after cancel", async function () {
            cache.clear("x");
            assert.strictEqual(await cache.getgreen("x"), false);
            assert.strictEqual(await cache.get("x"), 2);
            assert.strictEqual(await cache.getgreen("x"), 2);
        });
    });

});

