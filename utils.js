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
};
