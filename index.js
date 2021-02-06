const EventEmitter = require('events').EventEmitter;

module.exports = class CacheControl extends EventEmitter {

    constructor(async_resource_fn, options) {

        super();

        const opt = options || {};

        this.green_period = opt.green_period || 15000;
        this.red_period = opt.red_period || 15000;
        this.timeout = opt.timeout;

        this.cache_validity = this.green_period + this.red_period;

        this.async_resource_fn = async_resource_fn;

        this.cache = {};

    }

    getgreen(key) {

        //if (entry) this.cache[key].demanded = true;

        if (this._is_cache_value_green(this.cache[key])) return this.cache[key].value;
        else return false;

    }

    async get(key) {

        if (this._is_no_cache_value(this.cache[key]) || this._is_time_to_update_cache(this.cache[key])) {
            this._create_promise(key).catch(err => { });
        }

        if (this._is_cache_value_valid(this.cache[key])) {
            return this.cache[key].value;
        }

        return this.cache[key].promise;

    }

    _is_cache_value_green(entry) {
        return entry && entry.value && (entry.time + this.green_period) > Date.now();
    }

    _is_cache_value_valid(entry) {
        return entry && entry.value && (entry.time + this.cache_validity) > Date.now();
    }

    _is_no_cache_value(entry) {
        return !entry || !entry.value;
    }

    _is_time_to_update_cache(entry) {
        return entry && !entry.promise && (entry.time + this.green_period) < Date.now();
    }

    cancel(key) {
        if (this.cache[key]) delete this.cache[key].value;
    }

    async fetch(key) {
        if (this.timeout) {
            return await Promise.race([
                new Promise((resolve, reject) => setTimeout(() => reject("timeout"), this.timeout)),
                this.async_resource_fn(key)
            ]);
        }
        else return this.async_resource_fn(key);
    }

    _create_promise(key) {

        const cc = this;

        if (!cc.cache[key]) cc.cache[key] = {
            key: key,
            time: Date.now()
        };

        cc.cache[key].promise = this.fetch(key);

        cc.cache[key].promise
            .then(value => {
                cc.cache[key] = {
                    key: key,
                    time: Date.now(),
                    value: value
                };
            })
            .catch(err => {
                cc.emit("fail", key, err);
            })
            .finally(() => {
                if (cc.cache[key]) delete cc.cache[key].promise;
            });

        return cc.cache[key].promise;
    }

};