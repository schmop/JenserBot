module.exports = class Privilege {
    constructor(config) {
        this.config = config;
    }

    isUserAdmin(username) {
        const admins = this.config.get('admins', {});

        return null != admins[username];
    }

    getAllAdmins() {
        return this.config.get('admins', {});
    }
};
