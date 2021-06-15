const fetch = require("node-fetch");

module.exports = class ArztpraxisGifhorn {
    constructor(logger) {
        this.logger = logger;
        this.hatImpfe = false;
    }

    async neuerImpfStatus() {
        const letzteImpforte = await this.gibtsImpfe();
        const hatteImpfe = this.hatImpfe;
        this.hatImpfe = letzteImpforte.length > 0;

        return this.hatImpfe !== hatteImpfe;
    }

    impfStatus() {
        return this.hatImpfe;
    }

    async gibtsImpfe() {
        const url = 'https://onlinetermine.zollsoft.de/includes/searchTermine_app_feature.php';
        const body = {
            versichert: 1,
            terminsuche: '',
            uniqueident: '606d8c512d1ce'
        };
        const bodyAsString = Object.entries(body).map(([key, val]) => `${key}=${val}`).join('&');
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: bodyAsString,
                headers: {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                }
            });
            if (response.ok === false) {
                this.logger.error("Responsecode nicht ok!", response);
                try {
                    const data = await response.text();
                    this.logger.error("Kaputte Daten: ", data);
                } catch (e) {
                    this.logger.error("Leere Antwort erhalten!");
                }
            }
            try {
                const text = await response.text();
                let data = [];
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    if (text.includes('Captcha')) {
                        this.logger.warning('We got fucked by a captcha!');
                    } else {
                        this.logger.error('Unknown JSON error: ', text);
                    }

                    return [];
                }

                return data.terminsuchen.filter(termin => !termin.name.startsWith('2. Impfung')).length > 0;
            } catch (e) {
                this.logger.error('Unknown error occured', e);

                return [];
            }
        } catch (e) {
            this.logger.error(`Could not fetch from ${url}`, e);
        }
    }
};