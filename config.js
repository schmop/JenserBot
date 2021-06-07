const fs = require('fs');
const Utils = require('./utils');

module.exports = class Config {
    constructor(logger, configPath = '.config') {
        this.logger = logger;
        this.configPath = configPath;
        this.data = {};
        this._readConfig();
        this._persist = Utils.debounce(this._writeFile, 1000);
    }

    persist() {
        this._persist();
    }

    getWhitelist() {
        return this.get('whitelist', {});
    }

    setWhitelist(whitelist) {
        this.set('whitelist', whitelist);
    }


    getSuccessData() {
        return this.get('successData', {});
    }

    setSuccessData(successData) {
        this.set('successData', successData);
    }

    get(key, fallback = null) {
        if (this.data[key] == null) {
            return fallback;
        }

        return this.data[key];
    }

    set(key, val) {
        this.data[key] = val;
        this.persist();
    }

    persistSync() {
        let fileContent;
        try {
            fileContent = JSON.stringify(this.data, null, 4);
        } catch (e) {
            this.logger.error('Could not serialize config!', e);

            return;
        }
        try {
            fs.writeFileSync(this.configPath, fileContent, 'utf8');
        } catch (err) {
            this.logger.error(`Could not write config file "${this.configPath}"!`, err);
        }
    }

    _writeFile() {
        let fileContent;
        try {
            fileContent = JSON.stringify(this.data, null, 4);
        } catch (e) {
            this.logger.error('Could not serialize config!', e);

            return;
        }
        fs.writeFile(this.configPath, fileContent, 'utf8', err => {
            if (err != null) {
                this.logger.error(`Could not write config file "${this.configPath}"!`, err);
            }
        });
    }

    _readConfig() {
        let data;
        try {
            data = fs.readFileSync(this.configPath, 'utf8');
        } catch (err) {
            this.logger.error(`Could not read config file "${this.configPath}"!`, err);
        }
        if (typeof data === 'string') {
            try {
                this.data = JSON.parse(data);
            } catch (e) {
                this.logger.error(`Could not parse config file "${this.configPath}"!`, e);
            }
        }
    }
};