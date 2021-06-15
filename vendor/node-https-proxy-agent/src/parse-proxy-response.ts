import createDebug from 'debug';
import { Readable } from 'stream';
import {ClientRequest} from "agent-base";

const debug = createDebug('https-proxy-agent:parse-proxy-response');

export interface ProxyResponse {
	statusCode: number;
	buffered: Buffer;
}

export default function parseProxyResponse(
	socket: Readable,
	req: ClientRequest
): Promise<ProxyResponse> {
	return new Promise((resolve, reject) => {
		// we need to buffer any HTTP traffic that happens with the proxy before we get
		// the CONNECT response, so that if the response is anything other than an "200"
		// response code, then we can re-play the "data" events on the socket once the
		// HTTP parser is hooked up...
		let buffersLength = 0;
		const buffers: Buffer[] = [];

		function read() {
			const b = socket.read();
			if (b) ondata(b);
			else socket.once('readable', read);
		}

		function cleanup() {
			req.removeListener('error', onreqerror);
			socket.removeListener('end', onend);
			socket.removeListener('error', onerror);
			socket.removeListener('close', onclose);
			socket.removeListener('readable', read);
		}

		function onclose(err?: Error) {
			debug('onclose had error %o', err);
			reject(err);
		}

		function onend() {
			debug('onend');
			reject(new Error('Socket was closed by other party!'));
		}

		function onerror(err: Error) {
			cleanup();
			debug('onerror %o', err);
			reject(err);
		}

		function ondata(b: Buffer) {
			buffers.push(b);
			buffersLength += b.length;

			const buffered = Buffer.concat(buffers, buffersLength);
			const endOfHeaders = buffered.indexOf('\r\n\r\n');

			if (endOfHeaders === -1) {
				// keep buffering
				debug('have not received end of HTTP headers yet...');
				read();
				return;
			}

			const firstLine = buffered.toString(
				'ascii',
				0,
				buffered.indexOf('\r\n')
			);
			const statusCode = +firstLine.split(' ')[1];
			debug('got proxy server response: %o', firstLine);
			resolve({
				statusCode,
				buffered
			});
		}

		socket.on('error', onerror);
		socket.on('close', onclose);
		socket.on('end', onend);

		// when request timeouted or occured other errors,
		// we need to close the socket which is still connecting to the proxy
		req.on('error', onreqerror);

		function onreqerror(err: Error) {
			console.error(err);
			console.trace();
			socket.destroy();
			onerror(err);
		}

		read();
	});
}
