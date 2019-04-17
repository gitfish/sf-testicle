import { IAccessTokenSupplier, IAccessTokenResult, DefaultAccessTokenSupplier } from "./auth/core";
import * as rp from "request-promise-native";

interface IDataServiceOptions {
    accessTokenSupplier?: IAccessTokenSupplier;
}

interface IDataServiceConfig extends IDataServiceOptions {
    versionInfo?: IVersionInfo;
}

const DataServiceDefaults : IDataServiceConfig = {
    accessTokenSupplier: DefaultAccessTokenSupplier,
    versionInfo: {
        label: "Spring '19",
        url: "/services/data/v45.0",
        version: "45.0"
    }
};

interface IVersionInfo {
    version?: string;
    label?: string;
    url?: string;
}

interface IRecordAttributes {
    type: string;
    url: string;
}

interface IRecord {
    attributes?: IRecordAttributes;
    [key: string] : any; 
}

interface IQueryResult {
    done: boolean;
    totalSize: number;
    records?: IRecord[];
}

interface IDataService {
    getVersionInfo() : Promise<IVersionInfo[]>;
    query(soql : string) : Promise<IQueryResult>;
}

class DataService implements IDataService {
    private _accessTokenPromise : Promise<IAccessTokenResult>;
    public accessTokenSupplier : IAccessTokenSupplier;
    constructor(rawOpts?: IDataServiceOptions) {
        const opts = { ...DataServiceDefaults, ...rawOpts };
        this.accessTokenSupplier = opts.accessTokenSupplier;
    }
    get accessTokenPromise() : Promise<IAccessTokenResult> {
        if(!this._accessTokenPromise) {
            this._accessTokenPromise = this.accessTokenSupplier();
        }
        return this._accessTokenPromise;
    }
    async getVersionInfo() : Promise<IVersionInfo[]> {
        // TODO: need to handle errors (to automatically grab another access token when expired, for example)
        const tr = await this.accessTokenPromise;
        return rp({
            url: `${tr.instance_url}/services/data/`,
            method: "GET",
            headers: {
                Authorization: `Bearer ${tr.access_token}`
            },
            json: true
        });
    }
    async getLatestVersion() : Promise<IVersionInfo> {
        const versions = await this.getVersionInfo();
        if(versions && versions.length > 0) {
            return versions.reduce((pv, cv) => {
                if(pv && cv) {
                    return parseFloat(cv.version) > parseFloat(pv.version) ? cv : pv;
                }
                return cv;
            });
        }
        return DataServiceDefaults.versionInfo;
    }
    async query(soql : string) : Promise<IQueryResult> {
        const latestVersion = await this.getLatestVersion();
        const tr = await this.accessTokenPromise;
        return rp({
            url: `${tr.instance_url}${latestVersion.url}/query`,
            headers: {
                Authorization: `Bearer ${tr.access_token}`
            },
            json: true,
            qs: {
                q: soql
            }
        });
    }
}

export {
    IDataService,
    DataService,
    IDataServiceOptions,
    DataServiceDefaults
}

