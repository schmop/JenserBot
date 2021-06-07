const fetch = require("node-fetch");

module.exports = class Jenser {
    constructor(config, plz = '38106', birthDate = '843948000000') {
        this.config = config;
        this.plz = plz;
        this.birthDate = birthDate;
    }

    /**
     * @return array Liste der Impfzentren, die Impfe haben
     */
    async woImpfe() {
        const url = `https://www.impfportal-niedersachsen.de/portal/rest/appointments/findVaccinationCenterListFree/${this.plz}?stiko=&count=1&birthdate=${this.birthDate}`;
        const response = await fetch(url);
        if (response.ok === false) {
            this.logger.error("API IS WEIRD, JO!", response);
            const data = await response.json();
            this.logger.error("Kaputte Daten: ", data);
        }
        try {
            const text = await response.text();
            let data = [];
            try {
                data = JSON.parse(text);
            } catch (e) {
                if (text.includes('Captcha')) {
                    this.logger.error('We got fucked by a captcha!');
                } else {
                    this.logger.error('Unknown JSON error: ', text);
                }
                return [];
            }
            this.logger.log("Jenser hat gesprochen: ", data);
            const resultList = data.resultList;
            return resultList.filter(impfZentrum => impfZentrum.outOfStock === false);
        } catch (e) {
            this.logger.error('Unknown error occured', e);
            return [];
        }
    }
};