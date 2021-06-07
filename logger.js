const fs = require('fs');
const Utils = require('./utils');

module.exports = class Logger {
    constructor(logPath = 'logs.txt') {
        this.logPath = logPath;
        this.lines = [];
        this.requestFlush = Utils.throttle(this._flush, 1000);
        this.telegram = null;
    }

    log() {
        this.info(...arguments);
    }

    info() {
        const line = this._formatLogMessage(this.constructor.INFO_LEVEL(), ...arguments);
        this._addToLog(line);
        console.info(line);
    }

    warning() {
        const line = this._formatLogMessage(this.constructor.WARN_LEVEL(), ...arguments);
        this._addToLog(line);
        console.warn(line);
    }

    error() {
        const line = this._formatLogMessage(this.constructor.ERROR_LEVEL(), ...arguments);
        this._addToLog(line);
        console.error(line);
        this._notifyMaintainer(line);
    }

    setTelegram(telegram) {
        this.telegram = telegram;
    }

    _addToLog(line) {
        this.lines.push(line);
        this.requestFlush();
    }

    _formatLogMessage(warnLevel, ...content) {
        const serializedArguments = [...content].map(argument => {
            if (typeof argument === 'string') {
                return argument;
            }

            return JSON.stringify(argument);
        });
        const loggingText = serializedArguments.join(', ');
        const date = (new Date()).toLocaleString('de');

        return `[${warnLevel}][${date}] ${loggingText}`;
    }

    _notifyMaintainer(line) {
        if (this.telegram != null) {
            this.telegram.sendMessageToMaintainer(line);
        }
    }

    _flush() {
        const fileContent = this.lines.join("\n") + "\n";
        this.lines = [];

        fs.appendFile(this.logPath, fileContent, 'utf8', err => {
            if (err != null) {
                this.error(`Could not write config file "${this.configPath}"!`, err);
            }
        });
    }

    static INFO_LEVEL() {
        return 'INFO';
    }

    static WARN_LEVEL() {
        return 'WARN';
    }

    static ERROR_LEVEL() {
        return 'FAIL';
    }
};