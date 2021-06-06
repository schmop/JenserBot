const Slimbot = require('slimbot');
const Jenser = require('./jenser');
const Config = require('./config');
const Privilege = require('./privilege');
const Telegram = require('./telegram');

const config = new Config();
const apiKey = config.get('apiKey');
if (apiKey == null) {
	console.error('Need the API Key of a Telegram Bot to work!');
	config.set('apiKey', null);
	config.persistSync();
	console.error('Put it in the .config file at the "apiKey" identifier!');
	process.exit(1);
}
const slimbot = new Slimbot(apiKey);
const privilege = new Privilege(config);
const telegram = new Telegram(slimbot, privilege);
const jensMeister = new Jenser();

let whitelist = config.get('whitelist', {});

console.log('Registering message listeners!');

telegram.registerCommand('start', message => {
    if (whitelist[message.chat.username] == null) {
        telegram.sendMessage(message.chat.id, `Hallo ${message.chat.first_name}!\nNun bist du Jensberechtigt 💉\nDu wirst automatisch über einen freien Termin in einem Braunschweiger Impfzentrum informiert!`);
        whitelist[message.chat.username] = {chatId: message.chat.id};
        config.set('whitelist', whitelist);

        return;
    }
    telegram.sendMessage(message.chat.id, 'Du bist doch schon längst Jensberechtigt!');
});

telegram.registerAdminCommand('whoami', message => {
    slimbot.sendMessage(message.chat.id, 'Ein wahrhaftiger Banger!');
});

telegram.addHelpCommand();

console.log('Start polling telegram messages!');

telegram.startPolling();

console.log('Start polling Jenser!');
setInterval(() => {
    const impfOrte = jensMeister.woImpfe();
    if (impfOrte.length > 0) {
        const impfZentrumsNamen = impfOrte.map(zentrum => `${zentrum.name}\n${zentrum.streetName} ${streetNumber}`);
        const message = `Es gibt Impfe in deiner Nähe: ${impfZentrumsNamen}\nSchnell anmelden: https://www.impfportal-niedersachsen.de/portal/#/appointment/public`;
        Object.keys(whitelist).forEach(vipName => {
            slimbot.sendMessage(whitelist[vipName].chatId, message);
        });
    }
}, 60000);