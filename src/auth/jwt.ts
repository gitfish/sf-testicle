import * as crypto from "crypto";
import "isomorphic-fetch";
import "isomorphic-form-data";
import * as fs from "fs";
import { IAccessSupplier, IAccess } from "./core";
import { jsonResponseHandler } from "../common";

interface IAccessTokenRequest {
    loginUrl?: string;
    assertionExpiryInterval?: number;
    username?: string;
    privateKey?: string;
    privateKeyPath?: string;
    consumerKey?: string;
    clientId?: string;
    tokenEndpoint?: string;
}

const DefaultBearerAccessTokenRequest : IAccessTokenRequest = {
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

const getAccessToken = (rawOpts : IAccessTokenRequest) : Promise<IAccess> => {
    const opts = { ...DefaultBearerAccessTokenRequest, ...rawOpts }; 
    const now = new Date();
    const expiry = now.getTime() + opts.assertionExpiryInterval;
    const header = { alg: "RS256" };
    const claims = {
        iss: opts.consumerKey || opts.clientId,
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

const createAccessSupplier = (opts : IAccessTokenRequest) : IAccessSupplier => {
    return () => {
        return getAccessToken(opts);
    };
};

export {
    getAccessToken,
    getAccessToken as default,
    createAccessSupplier,
    IAccessTokenRequest,
    DefaultBearerAccessTokenRequest
}