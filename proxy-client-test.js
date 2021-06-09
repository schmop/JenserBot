const ProxyClient = require('./proxy-client');
const Logger = require('./logger');

const logger = new Logger('proxy-client-test-logs.txt');
const client = new ProxyClient(logger);
const ipReflectionUrl = 'https://httpbin.org/ip';

process.on('uncaughtException', function (exception) {
    console.log(exception); // to see your exception details in the console
    // if you are on production, maybe you can send the exception details to your
    // email as well ?
});

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});

const realExit = process.exit;
const realAbort = process.abort;

process.exit = a => {
    console.log((new Error()).stack, a);
    realExit(a);
};

process.abort = a => {
    console.log((new Error()).stack, a);
    realAbort(a);
};

process.on('SIGTERM', signal => {
    console.log(`Process ${process.pid} received a SIGTERM signal`)
    process.exit(0)
})

process.on('SIGINT', signal => {
    console.log(`Process ${process.pid} has been interrupted`)
    process.exit(0)
})

process.on('beforeExit', code => {
    // Can make asynchronous calls
    setTimeout(() => {
        console.log(`Process will exit with code: ${code}`)
        process.exit(code)
    }, 100)
})

process.on('exit', code => {
    // Only synchronous calls
    console.log(`Process exited with code: ${code}`)
})

async function logReflection(depth = 10) {
    console.log("Depth: " + depth);
    const response = await client.fetch(ipReflectionUrl);
    if (response.ok === true) {
        const data = await response.text();
        logger.log(data);
    } else {
        logger.warn("reflection failed");
    }
    if (depth > 0) {
        await logReflection(depth - 1);
    } else {
        console.log("finished");
    }
}

(async () => {
    await client.init();
    await logReflection();
})();
