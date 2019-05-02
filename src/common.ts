import { IAccessSupplier, IAccess } from "./auth/core";
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
    access?: IAccess;
    accessSupplier?: IAccessSupplier;
    apiVersion?: IApiVersion;
}

const RestServiceDefaults : IRestServiceConfig = {
    apiVersion: {
        label: "Spring '19",
        url: "/services/data/v45.0",
        version: "45.0"
    }
};

class RestService {
    private _accessSupplier : IAccessSupplier;
    private _access : IAccess;
    private _accessPromise : Promise<IAccess>;
    private _apiVersion : IApiVersion;
    private _apiVersionsPromise : Promise<IApiVersion[]>;
    private _apiVersionPromise : Promise<IApiVersion>;
    
    constructor(opts?: IRestServiceConfig) {
        this.accessSupplier = opts ? opts.accessSupplier : undefined;
        this.access = opts ? opts.access : undefined;
        this.apiVersion = opts ? opts.apiVersion : undefined;
    }
    get accessSupplier() {
        return this._accessSupplier;
    }
    set accessSupplier(accessSupplier : IAccessSupplier) {
        if(accessSupplier !== this._accessSupplier) {
            delete this._accessPromise;
            delete this._apiVersionsPromise;
            delete this._apiVersionPromise;
            this._accessSupplier = accessSupplier;
        }
    }
    get access() {
        return this._access;
    }
    set access(value : IAccess) {
        if(value !== this._access) {
            this._access = value;
            delete this._accessPromise;
        }
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
    get accessPromise() : Promise<IAccess> {
        if(!this._accessPromise) {
            if(this.access) {
                this._accessPromise = Promise.resolve(this._access);
            } else if(this.accessSupplier) {
                this._accessPromise = Promise.resolve(this.accessSupplier());
            } else {
                this._accessPromise = Promise.reject({ code: "ILLEGAL_STATE", message: "Access or Access Supplier has not been configured" });
            }
        }
        return this._accessPromise;
    }
    get apiVersionsPromise() : Promise<IApiVersion[]> {
        if(!this._apiVersionsPromise) {
            this._apiVersionsPromise = this.accessPromise.then(tr => {
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
        return this.accessPromise.then(tr => {
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