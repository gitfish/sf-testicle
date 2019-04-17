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
    nextRecordsUrl?: string;
}

interface IQueryPlanFeedbackNote {
    description?: string;
    fields?: string[];
    tableEnumOrId?: string;
}

interface IQueryPlan {
    cardinality?: number;
    fields?: string[];
    leadingOperationType?: string;
    notes?: IQueryPlanFeedbackNote[];
    relativeCost?: number;
    sobjectCardinality?: number;
    sobjectType?: string;
}

interface IQueryExplainResult {
    plans?: IQueryPlan[];
}

interface IDataService {
    getVersionInfo() : Promise<IVersionInfo[]>;
    query(soql : string) : Promise<IQueryResult>;
    explain(soql : string) : Promise<IQueryExplainResult>;
    queryAll(soql : string) : Promise<IQueryResult>;
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
    async get<T>(opts : any) : Promise<T> {
        const tr = await this.accessTokenPromise;
        const uri = opts && opts.uri ? opts.uri : `${tr.instance_url}${opts && opts.path ? opts.path : ""}`;
        const req = { ...opts,
            uri: uri,
            method: "GET",
            headers: {
                Authorization: `Bearer ${tr.access_token}`
            },
            json: true
        };
        return rp(req);
    }
    async getVersionInfo() : Promise<IVersionInfo[]> {
        return this.get({ path: "/services/data/" });
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
    async vget<T>(opts : any) : Promise<T> {
        const latestVersion = await this.getLatestVersion();
        const vopts = { ...opts, path: `${latestVersion.url}${opts.path}` };
        return this.get(vopts);
    }
    async query(soql : string) : Promise<IQueryResult> {
        return this.vget({
            path: "/query",
            qs: {
                q: soql
            }
        });
    }
    async explain(soql : string) : Promise<IQueryExplainResult> {
        return this.vget({
            path: "/query",
            qs: {
                explain: soql
            }
        });
    }
    async queryAll(soql : string) : Promise<IQueryResult> {
        return this.vget({
            path: "/queryAll",
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

