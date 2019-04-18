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
    Id?: string;
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

interface IError {
    fields?: string[];
    message?: string;
    statusCode?: string;
}

interface ISaveResult {
    id: string;
    errors?: IError[];
    success: boolean;
}

interface IGetFieldValuesRequest {
    type: string;
    Id: string;
    fields: string[];
}

interface IDataService {
    versionInfo : Promise<IVersionInfo[]>;
    latestVersion : Promise<IVersionInfo>;
    query(soql : string) : Promise<IQueryResult>;
    explain(soql : string) : Promise<IQueryExplainResult>;
    queryAll(soql : string) : Promise<IQueryResult>;
    search(sosl : string) : Promise<ISearchResult>;
    parameterizedSearch(request : IParameterizedSearchRequest) : Promise<ISearchResult>;
    create(record : IRecord) : Promise<ISaveResult>;
    update(record : IRecord) : Promise<ISaveResult>;
    delete(record : IRecord) : Promise<any>;
    getFieldValues(request : IGetFieldValuesRequest) : Promise<IRecord>;
}

class DataService implements IDataService {
    private _accessPromise : Promise<IAccess>;
    private _accessSupplier : IAccessSupplier;
    private _versionInfoPromise : Promise<IVersionInfo[]>;
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
    get accessPromise() : Promise<IAccess> {
        if(!this._accessPromise) {
            this._accessPromise = Promise.resolve(this.accessSupplier());
        }
        return this._accessPromise;
    }
    request<T>(opts : any) : Promise<T> {
        return this.accessPromise.then(tr => {
            const uri = opts && opts.uri ? opts.uri : `${tr.instance_url}${opts && opts.path ? opts.path : ""}`;
            const headers = opts && opts.headers ? opts.header : {};
            headers.Authorization = `Bearer ${tr.access_token}`;
            delete opts.headers;
            const req = { ...opts,
                uri: uri,
                headers: headers,
                json: true
            };
            return rp(req).catch(err => {
                return Promise.reject(err.error ? err.error : err);
            });
        });
    }
    get<T>(opts : any) : Promise<T> {
        return this.request({ ...opts, method: "GET" });
    }
    post<T>(opts : any) : Promise<T> {
        return this.request({ ...opts, method: "POST" });
    }
    patch<T>(opts : any) : Promise<T> {
        return this.request({ ...opts, method: "PATCH" });
    }
    del<T>(opts : any) : Promise<T> {
        return this.request({ ...opts, method: "DELETE" });
    }
    get versionInfo() : Promise<IVersionInfo[]> {
        if(!this._versionInfoPromise) {
            this._versionInfoPromise = this.get({ path: "/services/data/" });
        }
        return this._versionInfoPromise;
    }
    get latestVersion() : Promise<IVersionInfo> {
        return this.versionInfo.then(versions => {
            if(versions && versions.length > 0) {
                return versions.reduce((pv, cv) => {
                    if(pv && cv) {
                        return parseFloat(cv.version) > parseFloat(pv.version) ? cv : pv;
                    }
                    return cv;
                });
            }
            return DataServiceDefaults.versionInfo;
        });
    }
    vget<T>(opts : any) : Promise<T> {
        return this.latestVersion.then(latestVersion => {
            const vopts = { ...opts, path: `${latestVersion.url}${opts.path}` };
            return this.get(vopts);
        });
    }
    vpost<T>(opts : any) : Promise<T> {
        return this.latestVersion.then(latestVersion => {
            const vopts = { ...opts, path: `${latestVersion.url}${opts.path}` };
            return this.post(vopts);
        });
    }
    vpatch<T>(opts : any) : Promise<T> {
        return this.latestVersion.then(latestVersion => {
            const vopts = { ...opts, path: `${latestVersion.url}${opts.path}` };
            return this.patch(vopts);
        });
    }
    vdel<T>(opts : any) : Promise<T> {
        return this.latestVersion.then(latestVersion => {
            const vopts = { ...opts, path: `${latestVersion.url}${opts.path}` };
            return this.del(vopts);
        });
    }
    query(soql : string) : Promise<IQueryResult> {
        return this.vget({
            path: "/query/",
            qs: {
                q: soql
            }
        });
    }
    explain(soql : string) : Promise<IQueryExplainResult> {
        return this.vget({
            path: "/query/",
            qs: {
                explain: soql
            }
        });
    }
    queryAll(soql : string) : Promise<IQueryResult> {
        return this.vget({
            path: "/queryAll/",
            qs: {
                q: soql
            }
        });
    }
    search(sosl : string) : Promise<ISearchResult> {
        return this.vget({
            path: "/search/",
            qs: {
                q: sosl
            }
        });
    }
    parameterizedSearch(request : IParameterizedSearchRequest) : Promise<ISearchResult> {
        return this.vpost({
            path: "/parameterizedSearch/",
            body: request
        });
    }
    private getType(record : IRecord) {
        return record.attributes && record.attributes.type ? record.attributes.type : record.type;
    }
    create(record : IRecord) : Promise<ISaveResult> {
        const reqRecord = { ...record };
        delete reqRecord.type;
        return this.vpost({
            path: `/sobjects/${this.getType(record)}/`,
            body: reqRecord
        });
    }
    update(record : IRecord) : Promise<ISaveResult> {
        const reqRecord = { ...record };
        delete reqRecord.type;
        return this.vpatch({
            path: `/sobjects/${this.getType(record)}/${record.Id}`,
            body: reqRecord
        });
    }
    delete(record : IRecord) : Promise<any> {
        return this.vdel({
            path: `/sobjects/${this.getType(record)}/${record.Id}`
        });
    }
    getFieldValues(request : IGetFieldValuesRequest) : Promise<IRecord> {
        return this.vget({
            path: `/sobjects/${request.type}/${request.Id}`,
            qs: {
                fields: request.fields.join(",")
            }
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

