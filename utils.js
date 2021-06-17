module.exports = class Utils {
    static debounce(func, wait) {
        let timeout;
        return function() {
            let context = this;
            function later(args) {
                timeout = null;
                func.apply(context, args);
            }
            clearTimeout(timeout);
            timeout = setTimeout(later, wait, arguments);
        };
    }

    static throttle(func, wait) {
        let timeout = null;
        return function() {
            let context = this;
            function later(args) {
                timeout = null;
                func.apply(context, args);
            }
            if (timeout == null) {
                timeout = setTimeout(later, wait, arguments);
            }
        };
    }

    static async timeoutPromise(promise, timeout = 10000, timeoutReturn = "timed out") {
        return await Promise.race([
            promise,
            new Promise((resolve, reject) => {
                setTimeout(resolve, timeout, timeoutReturn);
            })
        ]);
    }
};
