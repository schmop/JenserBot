const fetch = require("node-fetch");
const HttpsProxyAgent = require('./vendor/node-https-proxy-agent');
const Url = require('url');

module.exports = class ProxyClient {
    constructor(logger, config) {
        this.logger = logger;
        this.config = config;
        this.proxyIndex = 0;
        this.lastProxyIndex = 0;
        this.proxyAgents = [];
    }

    /**
     * @link https://github.com/ShiftyTR/Proxy-List
     */
    static get PROXY_LIST_URL() {
        return "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/https.txt";
    }

    async initFromConfig() {

    }

    async init() {
        const proxyList = this.config.getProxyList();
        if (proxyList.length > 0) {
            proxyList.forEach(proxy => {
                if (typeof proxy !== 'string') {
                    this._addProxyAgent(proxy.ip, proxy.weight);

                    return;
                }
                if (proxy.startsWith('http://')) {
                    this._addProxyAgent(proxy);
                } else {
                    this._addProxyAgent('http://' + proxy);
                }
            });

            return;
        }
        /*let response = await fetch(this.constructor.PROXY_LIST_URL);
        const rawList = await response.text();*/

        const rawList = `130.61.227.199:80
207.154.201.249:8080
195.201.61.51:8000
176.9.63.62:3128
178.63.17.151:3128
109.90.21.100:80
217.79.181.109:443
78.47.104.35:3128
130.61.102.41:80
130.61.155.13:80
188.166.162.1:3128
130.61.236.104:80
130.61.22.238:80
217.79.189.28:3128
159.89.29.28:3128
185.242.113.156:3128`;

        rawList
            .split("\n")
            .filter(line => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}$/.test(line))
            .forEach(ip => this._addProxyAgent("http://" + ip))
        ;
    }

    async fetch(url, options = {timeout: 20000}) {
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
                this.smartSelectProxy();
                tries++;
            }
        }
        this.logger.error("Proxies could not reach through!");

        return {ok: false, statusCode: 0, statusText: `${tries} tries to connect failed!`};
    }

    punishCurrentAgent() {
        this.punishAgent(this.proxyIndex);
    }


    punishLastAgent() {
        this.punishAgent(this.lastProxyIndex);
    }

    punishAgent(agentIndex) {
        this.proxyAgents[agentIndex].weight = Math.max(1, Math.floor(this.proxyAgents[agentIndex].weight / 2));
        this._saveAgents();
    }

    rewardCurrentAgent() {
        this.proxyAgents[this.proxyIndex].weight++;
        this._saveAgents();
    }

    smartSelectProxy() {
        this.lastProxyIndex = this.proxyIndex;
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
        this.lastProxyIndex = this.proxyIndex;
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

    _addProxyAgent(ip, weight = 10) {
        this.proxyAgents.push({
            weight: weight,
            agent: new HttpsProxyAgent(Object.assign(Url.parse(ip), {timeout: 20000}))
        });
    }

    _saveAgents() {
        this.config.setProxyList(this.proxyAgents.map(proxy => ({ip: proxy.agent.proxy.href, weight: proxy.weight})));
    }
};