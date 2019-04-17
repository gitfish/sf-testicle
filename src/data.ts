import { IAccessSupplier, IAccess, DefaultAccessSupplier, createConstantAccessSupplier } from "./auth/core";
import * as rp from "request-promise-native";

interface IDataServiceOptions {
    access?: IAccess;
    accessSupplier?: IAccessSupplier;
    
}

interface IDataServiceConfig extends IDataServiceOptions {
    versionInfo?: IVersionInfo;
}

const DataServiceDefaults : IDataServiceConfig = {
    accessSupplier: DefaultAccessSupplier,
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

interface ISearchSObjectSpec {
    fields?: string;
    name?: string;
    limit?: number;
}

interface IParameterizedSearchRequest {
    q?: string;
    fields?: string[];
    sobjects?: ISearchSObjectSpec[];
    in?: string;
    overallLimit?: number;
    defaultLimit?: number;
}

interface ISearchResult {
    searchRecords: IRecord[];
}

interface IDataService {
    getVersionInfo() : Promise<IVersionInfo[]>;
    query(soql : string) : Promise<IQueryResult>;
    explain(soql : string) : Promise<IQueryExplainResult>;
    queryAll(soql : string) : Promise<IQueryResult>;
    search(sosl : string) : Promise<ISearchResult>;
    parameterizedSearch(request : IParameterizedSearchRequest) : Promise<ISearchResult>;
}

class DataService implements IDataService {
    private _accessPromise : Promise<IAccess>;
    private _accessSupplier : IAccessSupplier;
    constructor(rawOpts?: IDataServiceOptions) {
        const opts = { ...DataServiceDefaults, ...rawOpts };
        this.accessSupplier = opts.accessSupplier;
        this.access = opts.access;
    }
    get accessSupplier() {
        return this._accessSupplier;
    }
    set accessSupplier(accessSupplier : IAccessSupplier) {
        if(accessSupplier !== this._accessSupplier) {
            delete this._accessPromise;
            this._accessSupplier = accessSupplier;
        }
    }
    set access(access : IAccess) {
        if(access) {
            this.accessSupplier = createConstantAccessSupplier(access);
        }
    }
    get accessTokenPromise() : Promise<IAccess> {
        if(!this._accessPromise) {
            this._accessPromise = Promise.resolve(this.accessSupplier());
        }
        return this._accessPromise;
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
    async post<T>(opts : any) : Promise<T> {
        const tr = await this.accessTokenPromise;
        const uri = opts && opts.uri ? opts.uri : `${tr.instance_url}${opts && opts.path ? opts.path : ""}`;
        const req = { ...opts,
            uri: uri,
            method: "POST",
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
    async vpost<T>(opts : any) : Promise<T> {
        const latestVersion = await this.getLatestVersion();
        const  vopts = { ...opts, path: `${latestVersion.url}${opts.path}` };
        return this.post(vopts);
    }
    async query(soql : string) : Promise<IQueryResult> {
        return this.vget({
            path: "/query/",
            qs: {
                q: soql
            }
        });
    }
    async explain(soql : string) : Promise<IQueryExplainResult> {
        return this.vget({
            path: "/query/",
            qs: {
                explain: soql
            }
        });
    }
    async queryAll(soql : string) : Promise<IQueryResult> {
        return this.vget({
            path: "/queryAll/",
            qs: {
                q: soql
            }
        });
    }
    async search(sosl : string) : Promise<ISearchResult> {
        return this.vget({
            path: "/search/",
            qs: {
                q: sosl
            }
        });
    }
    async parameterizedSearch(request : IParameterizedSearchRequest) : Promise<ISearchResult> {
        return this.vpost({
            path: "/parameterizedSearch/",
            body: request
        });
    }
}

export {
    IDataService,
    DataService,
    IDataServiceOptions,
    DataServiceDefaults,
    IVersionInfo,
    IRecordAttributes,
    IRecord,
    IQueryResult,
    IQueryPlanFeedbackNote,
    IQueryPlan,
    IQueryExplainResult,
    ISearchSObjectSpec,
    IParameterizedSearchRequest,
    ISearchResult
}

