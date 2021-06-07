module.exports = class Privilege {
    constructor(config) {
        this.config = config;
    }

    isUserWhitelisted(username) {
        return this.config.getWhitelist()[username] != null;
    }

    isUserAdmin(username) {
        const whitelist = this.config.getWhitelist();

        return username in whitelist && whitelist[username]['admin'] === true;
    }

    getAllAdmins() {
        const whitelist = this.config.getWhitelist();

        return Object.keys(whitelist)
            .filter(user => this.isUserAdmin(user))
            .map(user => whitelist[user])
        ;
    }
};
