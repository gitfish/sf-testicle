import "isomorphic-fetch";
import { jsonResponseHandler } from "../common";

interface ISessionOptions {
    loginUrl?: string;
    username?: string;
    clientId?: string;
    tokenEndpoint?: string;
}

interface IAccess {
    access_token: string;
    scope?: string;
    instance_url?: string;
    id?: string;
    token_type?: string;
}

interface IAddress {
    country?: string;
}

interface IPhotos {
    picture?: string;
    thumbnail: string;
    [key : string] : string;
}

interface IUrls {
    enterprise?: string;
    metadata?: string;
    partner?: string;
    rest?: string;
    sobjects?: string;
    search?: string;
    query?: string;
    recent?: string;
    tooling_soap?: string;
    tooling_rest?: string;
    profile?: string;
    feeds?: string;
    groups?: string;
    users?: string;
    feed_items?: string;
    feed_elements?: string;
    custom_domain?: string;
    [key : string] : string;
}

interface IUserInfo {
    sub?: string;
    user_id?: string;
    organization_id?: string;
    preferred_username?: string;
    nickname?: string;
    name?: string;
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
    zoneinfo?: string;
    photos?: IPhotos;
    profile?: string;
    picture?: string;
    address?: IAddress;
    urls?: IUrls;
    active?: boolean;
    user_type?: string;
    language?: string;
    locale?: string;
    utcOffset?: number;
    updated_at?: string;
    is_app_installed?: boolean;
}

interface ISession {
    getAccess() : Promise<IAccess>;
    getUserInfo() : Promise<IUserInfo>;
}

abstract class AbstractRestSession implements ISession {
    loginUrl : string;
    abstract getAccess() : Promise<IAccess>;
    getUserInfo() : Promise<IUserInfo> {
        return this.getAccess().then(access => {
            return fetch(`${this.loginUrl}/services/oauth2/userinfo`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${access.access_token}`
                }
            }).then(jsonResponseHandler);
        });
    }
}

class BasicRestSession extends AbstractRestSession {
    private _loginUrl : string;
    private _access : IAccess;
    constructor(loginUrl : string, access : IAccess) {
        super();
        this._loginUrl = loginUrl;
        this._access = access;
    }
    get loginUrl() {
        return this._loginUrl;
    }
    getAccess() : Promise<IAccess> {
        return Promise.resolve(this._access);
    }
}


export {
    ISessionOptions,
    IAccess,
    IUserInfo,
    ISession,
    AbstractRestSession,
    BasicRestSession
}