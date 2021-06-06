module.exports = class Telegram {
	constructor(slimbot) {
		this.slimbot = slimbot;
		this.commands = {};
		this.adminCommands = {};
	}
	
	startPolling() {
		this.slimbot('message', message => {
			//this.commands.forEach(command => command(message));
			//this.adminCommands.forEach(command => command(message));
		});
		this.slimbot.startPolling();	
	}
	
	_commandExists(command) {
		return this.commands[command] != null || this.adminCommands[command] != null;
	}
	
	registerCommand(command, callback) {
		if (this.commandExists(command)) {
			console.error(`Command ${command} was already defined!`);
			return;
		}
		this.commands[command] = callback;
	}
	
	registerAdminCommand(command, callback) {
		if (this.commandExists(command)) {
			console.error(`Command ${command} was already defined!`);
			return;
		}
		this.adminCommands[command] = callback;
	}
	
};
