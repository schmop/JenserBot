const fetch = require("node-fetch");

module.exports = class ArztpraxisGifhorn {
    constructor(logger) {
        this.logger = logger;
    }

    async gibtsImpfe() {
        const url = 'https://onlinetermine.zollsoft.de/includes/searchTermine_app_feature.php';
        const body = {
            versichert: 1,
            terminsuche: '',
            uniqueident: '606d8c512d1ce'
        };
        const bodyAsString = Object.entries(body).map(([key, val]) => `${key}=${val}`).join('&');
        const response = await fetch(url, {
            method: 'POST',
            body: bodyAsString,
            headers: {
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            }
        });
        if (response.ok === false) {
            this.logger.error("Responsecode nicht ok!", response);
            const data = await response.json();
            this.logger.error("Kaputte Daten: ", data);}
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

            return data.termine.length > 0;
        } catch (e) {
            this.logger.error('Unknown error occured', e);

            return [];
        }
    }
};