const fetch = require("node-fetch");

module.exports = class Jenser {
    constructor(logger, plz = '38106', birthDate = '843948000000') {
        this.logger = logger;
        this.plz = plz;
        this.birthDate = birthDate;
        this.successData = {
            consecutiveCaptchas: 0,
            numCaptchas: 0,
            sum: 0,
            errors: 0,
            successes: 0,
        };
    }

    getSuccessData() {
        return this.successData;
    }

    setSuccessData(data) {
        Object.keys(this.successData).forEach(key => {
            if (typeof data[key] === 'number') {
                this.successData[key] = data[key];
            }
        });
    }

    async woImpfe() {
        const url = `https://www.impfportal-niedersachsen.de/portal/rest/appointments/findVaccinationCenterListFree/${this.plz}?stiko=&count=1&birthdate=${this.birthDate}`;
        const response = await fetch(url);
        if (response.ok === false) {
            this.logger.error("API IS WEIRD, JO!", response);
            const data = await response.json();
            this.logger.error("Kaputte Daten: ", data);
            this._countError();
        }
        try {
            const text = await response.text();
            let data = [];
            try {
                data = JSON.parse(text);
            } catch (e) {
                if (text.includes('Captcha')) {
                    this.logger.warning('We got fucked by a captcha!');
                    this._countCaptcha();
                } else {
                    this.logger.error('Unknown JSON error: ', text);
                    this._countError();
                }

                return [];
            }
            const resultList = data.resultList;
            this._countSuccess();

            return resultList.filter(impfZentrum => impfZentrum.outOfStock === false);
        } catch (e) {
            this.logger.error('Unknown error occured', e);
            this._countError();

            return [];
        }
    }

    _countSuccess() {
        this.successData.sum++;
        this.successData.consecutiveCaptchas = 0;
        this.successData.successes++;
    }

    _countCaptcha() {
        this.successData.sum++;
        this.successData.consecutiveCaptchas++;
        this.successData.numCaptchas++;
    }

    _countError() {
        // intentionally no reset of the consecutive captchas
        this.successData.sum++;
        this.successData.errors++;
    }
};