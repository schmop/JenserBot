module.exports = class Privilege {
    constructor(config) {
        this.config = config;
    }

    isUserWhitelisted(username) {
        const whitelist = this.config.get('whitelist', {});

        return whitelist[username] != null;
    }

    isUserAdmin(username) {
        const whitelist = this.config.get('whitelist', {});

        return username in whitelist && whitelist[username]['admin'] === true;
    }
}