const Slimbot = require('slimbot');
const Logger = require('./logger');
const Config = require('./config');
const Privilege = require('./privilege');
const Telegram = require('./telegram');
const ProxyClient = require('./proxy-client');
const Jenser = require('./jenser');
const Gifhorn = require('./arztpraxis-gifhorn');

const logger = new Logger();
const config = new Config(logger);
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
const telegram = new Telegram(slimbot, privilege, logger);
logger.setTelegram(telegram);
const client = new ProxyClient(logger);
const jensMeister = new Jenser(logger, client);
jensMeister.setSuccessData(config.getSuccessData());
const gifhorn = new Gifhorn(logger);

let whitelist = config.getWhitelist();

logger.log('Registering message listeners!');

telegram.registerCommand('start', message => {
    if (whitelist[message.chat.username] == null) {
        telegram.sendMessage(message.chat.id, `Hallo ${message.chat.first_name}!\nNun bist du Jensberechtigt 💉\nDu wirst automatisch über einen freien Termin in einem Braunschweiger Impfzentrum informiert!`);
        whitelist[message.chat.username] = {chatId: message.chat.id};
        config.setWhitelist(whitelist);

        return;
    }
    telegram.sendMessage(message.chat.id, 'Du bist doch schon längst Jensberechtigt!');
});

telegram.registerCommand('stop', message => {
    if (whitelist[message.chat.username] != null) {
        telegram.sendMessage(message.chat.id, `Bis dann, ${message.chat.first_name}!\nDu bist nun von den Benachrichtigungen abgemeldet!`);
        delete whitelist[message.chat.username];
        config.setWhitelist(whitelist);

        return;
    }
    telegram.sendMessage(message.chat.id, 'Du musst erstmal mit /start angemeldet sein, damit du dich abmelden kannst!');
});

telegram.registerAdminCommand('registeredusers', message => {
    const userListMessage = Object.keys(whitelist).map(username => {
        if (privilege.isUserAdmin(username)) {
            return username + " (admin)";
        }

        return username;
    }).join("\n");

    telegram.sendMessage(message.chat.id, userListMessage);
});

telegram.registerAdminCommand('proxystats', message => {
    const proxystatsMessage = `Best agent: ${client.bestAgent}\nWorst agent: ${client.worstAgent}`;

    telegram.sendMessage(message.chat.id, proxystatsMessage);
});

telegram.registerAdminCommand('allproxies', message => {
    const proxies = client.weightSortedIps.join("\n");

    telegram.sendMessage(message.chat.id, proxies);
});

telegram.registerAdminCommand('whoami', message => {
    telegram.sendMessage(message.chat.id, 'Ein wahrhaftiger Banger!');
});

telegram.registerAdminCommand('status', message => {
    const data = jensMeister.getSuccessData();
    data.successRate = Math.round(data.successes / data.sum * 100) + "%";
    const statusMessage = Object.keys(data).map(name => `${name}: ${data[name]}`).join("\n");
    telegram.sendMessageToMaintainer(`Status:\n${statusMessage}`);
});

telegram.addHelpCommand();

logger.log('Start polling telegram messages!');

telegram.startPolling();

logger.log('Start polling Jenser!');

async function fragJens() {
    if (await jensMeister.neuerImpfStatus()) {
        if (jensMeister.impfStatus()) {
            const impfOrte = jensMeister.impfOrte();
            const impfZentrumsNamen = impfOrte.map(zentrum => `${zentrum.name}\n${zentrum.streetName} ${zentrum.streetNumber}`);
            const message = `Es gibt Impfe in deiner Nähe: ${impfZentrumsNamen}\nSchnell anmelden: https://www.impfportal-niedersachsen.de/portal/#/appointment/public`;
            logger.log('In Braunschweig einen Termin gefunden!');
            Object.keys(whitelist).forEach(vipName => {
                telegram.sendMessage(whitelist[vipName].chatId, message);
            });
        } else {
            Object.keys(whitelist).forEach(vipName => {
                telegram.sendMessage(whitelist[vipName].chatId, 'Der Impftermin in Braunschweig ist nicht mehr verfügbar.');
            });
            logger.log('Der Impftermin in Braunschweig ist nicht mehr verfügbar.');
        }
    }
    // persist successData
    const successData = jensMeister.getSuccessData();
    config.setSuccessData(successData);
    if (successData.consecutiveCaptchas % 100 === 99) {
        logger.error("100 captchas in a row!");
    }
}

async function fragGifhorn() {
    if (await gifhorn.neuerImpfStatus()) {
        if (gifhorn.impfStatus()) {
            const homepage = 'https://www.hausarztpraxis-gifhorn.de/covid19-impfung/';
            const message = `Es gibt Impfe in Gifhorn:\n${homepage}`;
            logger.log('In Gifhorn etwas gefunden!')
            Object.keys(whitelist).forEach(vipName => {
                telegram.sendMessage(whitelist[vipName].chatId, message);
            });
        } else {
            Object.keys(whitelist).forEach(vipName => {
                telegram.sendMessage(whitelist[vipName].chatId, "Der Impftermin in Gifhorn ist nicht mehr verfügbar.");
            });
        }
    }
}

async function impfIteration() {
    await fragJens();
    await fragGifhorn();
    setTimeout(impfIteration, 1000);
}

(async () => {
    await client.init();
    await impfIteration();
})();