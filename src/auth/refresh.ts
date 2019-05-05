import { ISessionOptions, IAccess } from "./core";
import "isomorphic-fetch";
import "isomorphic-form-data";
import { jsonResponseHandler } from "../common";

interface IRefreshSessionOptions extends ISessionOptions {
    refreshToken?: string;
    clientSecret?: string;
};

const DefaultRefreshSessionOptions : IRefreshSessionOptions = {
    loginUrl: "https://login.salesforce.com"
};

const createAccess = (opts : IRefreshSessionOptions) : Promise<IAccess> => {
    const formData = new FormData();
    formData.append("grant_type", "refresh_token");
    formData.append("refresh_token", opts.refreshToken);
    formData.append("client_id", opts.clientId);
    formData.append("client_secret", opts.clientSecret);
    return fetch(opts.tokenEndpoint || `${opts.loginUrl}/services/oauth2/token`, {
        method: "POST",
        body: formData,
        redirect: "follow"
    }).then(jsonResponseHandler);
};

export {
    IRefreshSessionOptions,
    createAccess,
    DefaultRefreshSessionOptions
}