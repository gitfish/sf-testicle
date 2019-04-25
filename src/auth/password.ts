import { IAccessSupplier, IAccess, IBaseAccessRequest } from "./core";
import "isomorphic-fetch";
import "isomorphic-form-data";
import { jsonResponseHandler } from "../common";

interface IPasswordAccessRequest extends IBaseAccessRequest {
    clientSecret?: string;
    username?: string;
    password?: string;
}

const DefaultAccessRequest : IPasswordAccessRequest = {
    loginUrl: "https://login.salesforce.com"
};

const getAccess = (request : IPasswordAccessRequest) : Promise<IAccess> => {
    const opts = { ...DefaultAccessRequest, ...request };
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

const createAccessSupplier = (request : IPasswordAccessRequest) : IAccessSupplier => {
    return () => {
        return getAccess(request);
    };
};

export {
    getAccess,
    getAccess as default,
    IPasswordAccessRequest,
    DefaultAccessRequest,
    createAccessSupplier
}