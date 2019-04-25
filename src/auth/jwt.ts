import * as crypto from "crypto";
import "isomorphic-fetch";
import "isomorphic-form-data";
import * as fs from "fs";
import { IAccessSupplier, IAccess, IBaseAccessRequest } from "./core";
import { jsonResponseHandler } from "../common";

interface IJwtAccessRequest extends IBaseAccessRequest {
    assertionExpiryInterval?: number;
    privateKey?: string;
    privateKeyPath?: string;
}

const DefaultAccessRequest : IJwtAccessRequest = {
    loginUrl: "https://login.salesforce.com",
    assertionExpiryInterval: 60 * 1000
};

// special base 64 encoding
const base64Encode = (buf : Buffer) => {
    return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const getAccess = (request : IJwtAccessRequest) : Promise<IAccess> => {
    const opts = { ...DefaultAccessRequest, ...request }; 
    const now = new Date();
    const expiry = now.getTime() + opts.assertionExpiryInterval;
    const header = { alg: "RS256" };
    const claims = {
        iss: opts.clientId,
        sub: opts.username,
        aud: opts.loginUrl,
        exp: expiry
    };
    const headerEncoded = base64Encode(Buffer.from(JSON.stringify(header)));
    const claimsEncoded = base64Encode(Buffer.from(JSON.stringify(claims)));
    const encodedAssertion = `${headerEncoded}.${claimsEncoded}`;

    let privateKey = opts.privateKey;
    if(!privateKey && opts.privateKeyPath) {
        privateKey = fs.readFileSync(opts.privateKeyPath, { encoding: "UTF-8" });
    }

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(encodedAssertion);
    const signedAssertion = base64Encode(sign.sign(privateKey));

    const jwtAssertion = `${encodedAssertion}.${signedAssertion}`;

    const formData = new FormData();
    formData.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
    formData.append("assertion", jwtAssertion);
    return fetch(opts.tokenEndpoint || `${opts.loginUrl}/services/oauth2/token`, {
        method: "POST",
        body: formData,
        redirect: "follow"
    }).then(jsonResponseHandler);
};

const createAccessSupplier = (request : IJwtAccessRequest) : IAccessSupplier => {
    return () => {
        return getAccess(request);
    };
};

export {
    getAccess,
    getAccess as default,
    createAccessSupplier,
    IJwtAccessRequest,
    DefaultAccessRequest
}