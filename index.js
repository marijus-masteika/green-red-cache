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
        return this.value_is_green(key) ? this.cache[key].value : false;
    }

    async get(key) {

        if (this.value_is_empty(key) || this.value_update_is_needed(key)) this.update(key).catch(err => { });

        return this.value_is_valid(key) ? this.cache[key].value : this.cache[key].promise;

    }

    value_is_green(key) {
        return !this.value_is_empty(key) && (this.cache[key].time + this.green_period) > Date.now();
    }

    value_is_valid(key) {
        return !this.value_is_empty(key) && (this.cache[key].time + this.cache_validity) > Date.now();
    }

    value_is_empty(key) {
        return !(this.cache[key] && this.cache[key].value !== undefined);
    }

    value_update_is_needed(key) {
        return !this.value_is_empty(key) && (this.cache[key].time + this.green_period) < Date.now();
    }

    entry_is_garbage(key) {
        return this.cache[key] && !this.cache[key].promise && !this.value_is_valid(key);
    }

    clear(key) {
        if (this.cache[key] && this.cache[key].promise) delete this.cache[key].value;
        else delete this.cache[key];
    }

    async _fetch(key) {
        if (this.timeout) {
            return await Promise.race([
                new Promise((resolve, reject) => setTimeout(() => reject("timeout"), this.timeout)),
                this.async_resource_fn(key)
            ]);
        }
        else return this.async_resource_fn(key);
    }

    async update(key) {

        const update_promise = this._fetch(key);

        const self = this;
        if (!self.cache[key]) self.cache[key] = { key };
        self.cache[key].promise = update_promise;

        update_promise
            .then(value => {
                self.cache[key] = {
                    key: key,
                    time: Date.now(),
                    value: value
                };
            })
            .catch(err => {
                self.emit("fail", key, err);
            })
            .finally(() => {
                if (self.cache[key]) delete self.cache[key].promise;
            });

        return update_promise;
    }

    *garbage() {
        for (const key in this.cache) if (this.entry_is_garbage(key)) yield (key);
    }

    *passing() {
        for (const key in this.cache) if (this.value_update_is_needed(key)) yield (key);
    }

};