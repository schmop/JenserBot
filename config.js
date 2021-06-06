const fs = require('fs');
const Utils = require('./utils');

module.exports = class Config {
	constructor(configPath = '.config') {
		this.configPath = configPath;
		this.data = {};
		this._readConfig();
		this._persist = Utils.debounce(this._writeFile, 1000);
	}
	
	persist() {
		this._persist();
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
			console.error('Could not serialize config!', e);
			
			return;
		}
		try {
			fs.writeFileSync(this.configPath, fileContent, 'utf8');
		} catch (err) {
			console.error(`Could not write config file "${this.configPath}"!`, err);
		}
	}
	
	_readConfig() {
		let data;
		try {
			data = fs.readFileSync(this.configPath, 'utf8');
		} catch (err) {
			console.error(`Could not read config file "${this.configPath}"!`, err);
		}
		if (typeof data === 'string') {
			try {
				this.data = JSON.parse(data);
			} catch (e) {
				console.error(`Could not parse config file "${this.configPath}"!`, e);
			}
		}
	}
	
	_writeFile() {
		let fileContent;
		try {
			fileContent = JSON.stringify(this.data, null, 4);
		} catch (e) {
			console.error('Could not serialize config!', e);
			
			return;
		}
		fs.writeFile(this.configPath, fileContent, 'utf8', err => {
			if (err != null) {
				console.error(`Could not write config file "${this.configPath}"!`, err);
			}
		});
	}
};