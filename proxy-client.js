const fetch = require("node-fetch");
const HttpsProxyAgent = require('https-proxy-agent');

module.exports = class ProxyClient {
    constructor(logger) {
        this.logger = logger;
        this.proxyIndex = 0;
        this.proxyAgents = [];
    }

    /**
     * @link https://github.com/ShiftyTR/Proxy-List
     */
    static get PROXY_LIST_URL() {
        return "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/https.txt";
    }

    async init() {
        let response = await fetch(this.constructor.PROXY_LIST_URL);
        const rawList = await response.text();
        rawList
            .split("\n")
            .filter(line => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}$/.test(line))
            .forEach(ip => this._addProxyAgent("http://" + ip))
        ;
    }

    async fetch(url, options = {}) {
        let tries = 0;
        while (tries < this.constructor.RETRIES) {
            try {
                this.logger.info("Try connect to ", this.currentIp);
                const response = await fetch(url, Object.assign(options, {agent: this.currentAgent}));
                this.rewardCurrentAgent();
                this.smartSelectProxy();

                return response;
            } catch (e) {
                this.logger.warn("Punish agent for not obeying", this.currentIp);
                this.punishCurrentAgent();
                this.logger.warn("Best agent", this.bestAgent);
                this.logger.warn("Worst agent", this.worstAgent);
                this.smartSelectProxy();
                tries++;
            }
        }
        this.logger.error("Proxies could not reach through!");

        return {ok: false};
    }

    punishCurrentAgent() {
        this.proxyAgents[this.proxyIndex].weight = Math.max(1, Math.floor(this.proxyAgents[this.proxyIndex].weight / 2));
    }

    rewardCurrentAgent() {
        this.proxyAgents[this.proxyIndex].weight++;
    }

    smartSelectProxy() {
        const sumOfWeights = this.proxyAgents.map(agent => agent.weight).reduce((carry, val) => carry + val, 0);
        let randVal = Math.random() * sumOfWeights;
        for (let i = 0; i < this.numAgents; i++) {
            const weight = this.proxyAgents[i].weight;
            if (randVal < weight) {
                this.proxyIndex = i;

                return;
            }
            randVal -= weight;
        }
    }

    get bestAgent() {
        return this.weightSortedIps[this.numAgents - 1];
    }

    get worstAgent() {
        return this.weightSortedIps[0];
    }

    get weightSortedIps() {
        return [...this.proxyAgents]
            .sort((a,b) => a.weight - b.weight)
            .map(a => a.weight + "\t" + a.agent.proxy.href)
        ;
    }

    selectNextProxy() {
        this.proxyIndex = (this.proxyIndex + 1) % this.proxyAgents.length;
    }

    get currentIp() {
        return this.currentAgent.proxy.href;
    }

    get currentAgent() {
        return this.proxyAgents[this.proxyIndex].agent;
    }

    get numAgents() {
        return this.proxyAgents.length;
    }

    static get RETRIES() {
        return 20;
    }

    _addProxyAgent(ip) {
        this.proxyAgents.push({
            weight: 10,
            agent: new HttpsProxyAgent(ip)
        });
    }
};