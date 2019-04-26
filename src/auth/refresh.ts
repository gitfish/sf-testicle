import { IBaseAccessRequest, IAccess } from "./core";
import "isomorphic-fetch";
import "isomorphic-form-data";
import { jsonResponseHandler } from "../common";

interface IRefreshAccessRequest extends IBaseAccessRequest {
    refreshToken?: string;
    clientSecret?: string;
};

const DefaultAccessRequest : IRefreshAccessRequest = {
    loginUrl: "https://login.salesforce.com"
};

const getAccess = (request : IRefreshAccessRequest) : Promise<IAccess> => {
    const opts = { ...DefaultAccessRequest, ...request };
    const formData = new FormData();
    formData.append("grant_type", "refresh_token");
    formData.append("refresh_token", request.refreshToken);
    formData.append("client_id", opts.clientId);
    formData.append("client_secret", opts.clientSecret);
    return fetch(opts.tokenEndpoint || `${opts.loginUrl}/services/oauth2/token`, {
        method: "POST",
        body: formData,
        redirect: "follow"
    }).then(jsonResponseHandler);
};

export {
    IRefreshAccessRequest,
    DefaultAccessRequest,
    getAccess
}