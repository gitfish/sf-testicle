import { ISession, IAccess, IUserInfo } from "./auth/core";
import * as qs from "qs";

const jsonResponseErrorHandler = (response) => {
    return response.json().then(error => {
        throw {
            status: response.status,
            statusText: response.statusText,
            error: error
        };
    });
};

const jsonResponseHandler = (response : Response) => {
    if(response.ok) {
        return response.json();
    }
    return jsonResponseErrorHandler(response);
};

const blobResponseHandler = (response : Response) => {
    if(response.ok) {
        return response.blob();
    }
    return jsonResponseErrorHandler(response);
};

interface IApiVersion {
    version?: string;
    label?: string;
    url?: string;
}

interface IRestServiceConfig {
    session?: ISession;
    apiVersion?: IApiVersion;
}

const RestServiceDefaults : IRestServiceConfig = {
    apiVersion: {
        label: "Spring '19",
        url: "/services/data/v45.0",
        version: "45.0"
    }
};

class RestService implements ISession {
    private _session : ISession;
    private _apiVersion : IApiVersion;
    private _apiVersionsPromise : Promise<IApiVersion[]>;
    private _apiVersionPromise : Promise<IApiVersion>;
    
    constructor(opts?: IRestServiceConfig) {
        this._session = opts ? opts.session : undefined;
        this.apiVersion = opts ? opts.apiVersion : undefined;
    }
    get session() {
        return this._session;
    }
    set session(value) {
        if(value !== this._session) {
            this._session = value;
            delete this._apiVersionsPromise;
            delete this._apiVersionPromise;
        }
    }
    getAccess() : Promise<IAccess> {
        return this.session ? this.session.getAccess() : Promise.reject({
            code: "INVALID_STATE",
            message: "A session has not been configured"
        });
    }
    getUserInfo() : Promise<IUserInfo> {
        return this.session ? this.session.getUserInfo() : Promise.reject({
            code: "INVALID_STATE",
            message: "A session has not been configured"
        });
    }
    get apiVersion() {
        return this._apiVersion;
    }
    set apiVersion(value) {
        if(value !== this._apiVersion) {
            this._apiVersion = value;
            delete this._apiVersionPromise;
        }
    }
    get apiVersionsPromise() : Promise<IApiVersion[]> {
        if(!this._apiVersionsPromise) {
            this._apiVersionsPromise = this.getAccess().then(tr => {
                return fetch(`${tr.instance_url}/services/data/`, {
                    headers: {
                        Authorization: `Bearer ${tr.access_token}`
                    }
                }).then(jsonResponseHandler);
            });
        }
        return this._apiVersionsPromise;
    }
    get apiVersionPromise() : Promise<IApiVersion> {
        if(!this._apiVersionPromise) {
            if(this.apiVersion) {
                this._apiVersionPromise = Promise.resolve(this.apiVersion);
            } else {
                this._apiVersionPromise = this.apiVersionsPromise.then(versions => {
                    if(versions && versions.length > 0) {
                        return versions.reduce((pv, cv) => {
                            if(pv && cv) {
                                return parseFloat(cv.version) > parseFloat(pv.version) ? cv : pv;
                            }
                            return cv;
                        });
                    }
                    return RestServiceDefaults.apiVersion;
                });
            }
        }
        return this._apiVersionPromise;
    }
    public getApiVersion() : Promise<IApiVersion> {
        return this.apiVersionPromise;
    }
    public fetch(opts : any) : Promise<any> {
        return this.session.getAccess().then(tr => {
            return this.apiVersionPromise.then(apiVersion => {
                let url = `${tr.instance_url}${apiVersion.url}${opts.path}`;
                if(opts.qs) {
                    url += `?${qs.stringify(opts.qs)}`;
                }
                const headers = {
                    Authorization: `Bearer ${tr.access_token}`
                };
                headers["Content-Type"] = opts.body ? "application/json" : undefined;

                const fetchOpts = {
                    method: opts.method ? opts.method : opts.body || opts.form ? "POST" : "GET",
                    headers: headers,
                    body: opts.form ? opts.form : opts.body ? JSON.stringify(opts.body) : undefined
                };
                let fp = fetch(url, fetchOpts);
                if(!opts.resolveWithFullResponse) {
                    fp = fp.then(jsonResponseHandler);
                }
                return fp;
            });
        });
    }
    get(opts : any) : Promise<any> {
        return this.fetch({ ...opts, method: "GET" });
    }
    post(opts : any) : Promise<any> {
        return this.fetch({ ...opts, method: "POST" });
    }
    patch(opts : any) : Promise<any> {
        return this.fetch({ ...opts, method: "PATCH" });
    }
    del(opts : any) : Promise<any> {
        return this.fetch({ ...opts, method: "DELETE" });
    }
}

export {
    jsonResponseErrorHandler,
    jsonResponseHandler,
    blobResponseHandler,
    IApiVersion,
    IRestServiceConfig,
    RestServiceDefaults,
    RestService
}