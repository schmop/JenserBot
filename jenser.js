const Utils = require('./utils');

module.exports = class Jenser {
    constructor(logger, client, plz = '38106', birthDate = '843948000000') {
        this.logger = logger;
        this.client = client;
        this.plz = plz;
        this.birthDate = birthDate;
        this.successData = {
            consecutiveCaptchas: 0,
            numCaptchas: 0,
            sum: 0,
            errors: 0,
            successes: 0,
        };
        this.hatImpfe = false;
        this.letzteImpforte = [];
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

    impfOrte() {
        return this.letzteImpforte;
    }

    async neuerImpfStatus() {
        this.letzteImpforte = await this.woImpfe();
        const hatteImpfe = this.hatImpfe;
        this.hatImpfe = this.letzteImpforte.length > 0;

        return this.hatImpfe !== hatteImpfe;
    }

    impfStatus() {
        return this.hatImpfe;
    }

    async woImpfe() {
        const url = `https://www.impfportal-niedersachsen.de/portal/rest/appointments/findVaccinationCenterListFree/${this.plz}?stiko=&count=1&birthdate=${this.birthDate}`;
        const response = await this.client.fetch(url);
        if (response.ok !== true) {
            this.logger.warning("Fehlercode erhalten!", response.statusCode, response.statusText);
            try {
                // sometimes .text() won't stop
                const data = await Utils.timeoutPromise(
                    response.text(),
                    5000,
                    '<Fetching text from response timed out>'
                );
                this.logger.warning("Kaputte Daten: ", data);
            } catch (e) {
                this.logger.warning("Leere Antwort erhalten!");
            }
            this._countError();
            return [];
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
        this.client.punishLastAgent();
        this.successData.sum++;
        this.successData.consecutiveCaptchas++;
        this.successData.numCaptchas++;
    }

    _countError() {
        // intentionally no reset of the consecutive captchas
        this.client.punishLastAgent();
        this.successData.sum++;
        this.successData.errors++;
    }
};