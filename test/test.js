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
        assert.equal(error, true);
        assert.deepEqual(cache.cache.x, {
            key: 'x',
            time: cache.cache.x.time
        });
    });

    it("#get()", async function () {

        const cache = new cc(async key => Promise.resolve(0), {
            timeout: 1000
        });

        try {
            rez = await cache.get("x");
            assert.equal(rez, 0);
        } catch (err) {
            throw new Error("should not fail");
        }
        await timeout(100);
        assert.deepEqual(cache.cache.x, {
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
        assert.equal(rez, 1);

        await timeout(1000);
        rez = await cache.get("x");
        assert.equal(rez, 1);

        await timeout(1000);
        rez = await cache.get("x");
        assert.equal(rez, 1);

        await timeout(1000);
        rez = await cache.get("x");
        assert.equal(rez, 1);

        await timeout(1000);
        rez = await cache.get("x");
        assert.equal(rez, 2);

        await timeout(1000);
        rez = await cache.get("x");
        assert.equal(rez, 2);

        await timeout(1000);
        rez = await cache.get("x");
        assert.equal(rez, 2);

        await timeout(1000);
        rez = await cache.get("x");
        assert.equal(rez, 2);


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
            assert.equal(rez, 0);
        } catch (err) {
            throw new Error("should not fail");
        }

        assert.deepEqual(cache.cache.x, {
            key: 'x',
            value: 0,
            time: cache.cache.x.time
        });
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
            assert.equal(cache.getgreen("x"), false);
        });
        it("entry created, shall return value", async function () {
            await cache.get("x");
            assert.equal(cache.getgreen("x"), "ok");
        });
        it("entry expired, shall return false", async function () {
            this.timeout(10000);
            await timeout(2000);
            assert.equal(cache.getgreen("x"), false);
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
            assert.equal(cache.getgreen("x"), false);
            cache.cancel("x");
            assert.equal(cache.getgreen("x"), false);
        });
        it("shall return new value", async function () {
            assert.equal(await cache.get("x"), 1);
        });
        it("shall return from cache", async function () {
            assert.equal(await cache.getgreen("x"), 1);
            assert.equal(await cache.get("x"), 1);
        });
        it("shall return new value after cancel", async function () {
            cache.cancel("x");
            assert.equal(await cache.getgreen("x"), false);
            assert.equal(await cache.get("x"), 2);
            assert.equal(await cache.getgreen("x"), 2);
        });
    });

});

