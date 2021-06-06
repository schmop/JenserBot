module.exports = class Telegram {
    constructor(slimbot, privilege) {
        this.slimbot = slimbot;
        this.privilege = privilege;
        this.commands = {};
        this.adminCommands = {};
    }

    sendMessage(chatId, message) {
        this.slimbot.sendMessage(chatId, message);
    }

    startPolling() {
        this._registerEventListeners();
        this.slimbot.startPolling();
    }

    registerCommand(command, callback) {
        if (this._commandExists(command)) {
            console.error(`Command ${command} was already defined!`);
            return;
        }
        this.commands[command] = callback;
    }

    registerAdminCommand(command, callback) {
        if (this._commandExists(command)) {
            console.error(`Command ${command} was already defined!`);
            return;
        }
        this.adminCommands[command] = callback;
    }

    addHelpCommand() {
        this.registerAdminCommand('adminhilfe', message => {
            this._printAdminHelp(message.chat.id);
            this._printHelp(message.chat.id);
        });
        this.registerCommand('hilfe', message => {
            this._printHelp(message.chat.id);
        });
    }

    _printAdminHelp(chatId) {
        const commands = Object.keys(this.adminCommands).map(command => '/' + command).join("\n");
        this.sendMessage(chatId, `Admin commands:\n${commands}`);
    }

    _printHelp(chatId) {
        const commands = Object.keys(this.commands).map(command => '/' + command).join("\n");
        this.sendMessage(chatId, `Commands:\n${commands}`);
    }

    _registerEventListeners() {
        this.slimbot.on('message', message => {
            if (message.text[0] === '/') {
                const command = message.text.substr(1).toLowerCase().split(' ')[0];
                console.log(message, command, this.commands, this.adminCommands);
                if (this.privilege.isUserAdmin(message.chat.username)) {
                    if (typeof this.adminCommands[command] === 'function') {
                        this.adminCommands[command](message);

                        return;
                    }
                }
                if (typeof this.commands[command] === 'function') {
                    this.commands[command](message);

                    return;
                }
                this.sendMessage(message.chat.id, `Der Befehl "${command}" ist mir nicht bekannt. Schreib "/hilfe" um mein Vokabular zu erfahren!`);
            }
        });
    }

    _commandExists(command) {
        return this.commands[command] != null || this.adminCommands[command] != null;
    }
};
