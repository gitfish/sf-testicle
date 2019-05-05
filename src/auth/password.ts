import { IAccess, ISession, AbstractRestSession, ISessionOptions } from "./core";
import "isomorphic-fetch";
import "isomorphic-form-data";
import { jsonResponseHandler } from "../common";

interface IPasswordSessionOptions extends ISessionOptions {
    clientSecret?: string;
    username?: string;
    password?: string;
}

const DefaultPasswordSessionOptions : IPasswordSessionOptions = {
    loginUrl: "https://login.salesforce.com"
};

const createAccess = (opts : IPasswordSessionOptions) : Promise<IAccess> => {
    const formData = new FormData();
    formData.append("grant_type", "password");
    formData.append("client_id", opts.clientId);
    formData.append("client_secret", opts.clientSecret);
    formData.append("username", opts.username);
    formData.append("password", opts.password);
    return fetch(opts.tokenEndpoint || `${opts.loginUrl}/services/oauth2/token`, {
        method: "POST",
        body: formData,
        redirect: "follow"
    }).then(jsonResponseHandler);
};

class PasswordSession extends AbstractRestSession {
    private _opts : IPasswordSessionOptions;
    private _accessPromise : Promise<IAccess>;
    constructor(opts : IPasswordSessionOptions) {
        super();
        this._opts = { ...DefaultPasswordSessionOptions, ...opts };
    }
    get loginUrl() {
        return this._opts.loginUrl;
    }
    getAccess() : Promise<IAccess> {
        if(!this._accessPromise) {
            this._accessPromise = createAccess(this._opts);
        }
        return this._accessPromise;
    }
}

const createSession = (opts : IPasswordSessionOptions) : ISession => {
    return new PasswordSession(opts);
};

export {
    createAccess,
    IPasswordSessionOptions,
    PasswordSession,
    createSession,
    DefaultPasswordSessionOptions
}