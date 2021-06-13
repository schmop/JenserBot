/// <reference types="node" />
import { Readable } from 'stream';
import { ClientRequest } from "agent-base";
export interface ProxyResponse {
    statusCode: number;
    buffered: Buffer;
}
export default function parseProxyResponse(socket: Readable, req: ClientRequest): Promise<ProxyResponse>;
