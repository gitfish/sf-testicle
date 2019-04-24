import { IAccessSupplier, IAccess, DefaultAccessSupplier, createConstantAccessSupplier } from "./auth/core";
import "isomorphic-fetch";
import * as qs from "qs";

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
    type?: string;
    url?: string;
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

interface IUpsertResult {
    created?: boolean;
}

interface IRetrieveRequest {
    type: string;
    Id?: string;
    externalIdField?: string;
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
    update(record : IRecord) : Promise<any>;
    delete(record : IRecord) : Promise<any>;
    upsert(record : IRecord, externalIdField?: string) : Promise<IUpsertResult>;
    retrieve(request : IRetrieveRequest) : Promise<IRecord>;
}

class DataService implements IDataService {
    private _accessSupplier : IAccessSupplier;
    private _accessPromise : Promise<IAccess>;
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
            delete this._versionInfoPromise;
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
    protected _fetch<T>(opts : any) : Promise<T> {
        return this.accessPromise.then(tr => {
            let uri = opts && opts.uri ? opts.uri : `${tr.instance_url}${opts && opts.path ? opts.path : ""}`;
            if(opts.qs) {
                uri += "?" + qs.stringify(opts.qs);
            }
            const headers = opts && opts.headers ? opts.header : {};
            const fetchHeaders = { "Content-Type": "application/json", ...headers };
            fetchHeaders.Authorization = `Bearer ${tr.access_token}`;
            const fetchOptions : any = {
                headers: fetchHeaders
            };
            if(opts.method) {
                fetchOptions.method = opts.method
            }
            if(opts.body) {
                fetchOptions.body = typeof(opts.body) === "object" ? JSON.stringify(opts.body) : opts.body;
            } else if(opts.form) {
                fetchOptions.body = opts.form;
            }
            return fetch(uri, fetchOptions).then(response => {
                if(opts.resolveWithFullResponse) {
                    return response;
                }
                if(response.ok) {
                    return response.json();
                }
                return response.json().then(error => {
                    throw {
                        status: response.status,
                        statusText: response.statusText,
                        error: error
                    };
                });
            });
        });
    }
    get<T>(opts : any) : Promise<T> {
        return this._fetch({ ...opts, method: "GET" });
    }
    post<T>(opts : any) : Promise<T> {
        return this._fetch({ ...opts, method: "POST" });
    }
    patch<T>(opts : any) : Promise<T> {
        return this._fetch({ ...opts, method: "PATCH" });
    }
    del<T>(opts : any) : Promise<T> {
        return this._fetch({ ...opts, method: "DELETE" });
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
    private getSObjectType(record : IRecord) {
        const type = record.attributes ? record.attributes.type : undefined;
        if(!type) {
            throw { errorCode: "INVALID_ARGUMENT", message: "Unable to resolve record sobject type" };
        }
        return type;
    }
    create(record : IRecord) : Promise<ISaveResult> {
        return this.vpost({
            path: `/sobjects/${this.getSObjectType(record)}/`,
            body: { ...record, attributes: undefined }
        });
    }
    update(record : IRecord) : Promise<any> {
        return this.vpatch({
            path: `/sobjects/${this.getSObjectType(record)}/${record.Id}`,
            body: { ...record, Id: undefined, attributes: undefined }
        });
    }
    delete(record : IRecord) : Promise<any> {
        return this.vdel({
            path: `/sobjects/${this.getSObjectType(record)}/${record.Id}`
        });
    }
    retrieve(request : IRetrieveRequest) : Promise<IRecord> {
        const path = request.externalIdField ?
            `/sobjects/${request.type}/${request.externalIdField}/${request.Id}` :
            `/sobjects/${request.type}/${request.Id}`;
        return this.vget({
            path: path,
            qs: {
                fields: request.fields.join(",")
            }
        });
    }
    upsert(record : IRecord, externalIdField?: string) : Promise<IUpsertResult> {
        // TODO
        const type = this.getSObjectType(record);
        if(!externalIdField) {
            if(record.Id) {
                // update
                return this.update(record).then(sr => {
                    return { ...sr, id: record.Id, created: false };
                });
            } 
            // create
            return this.create(record).then(sr => {
                return { ...sr, created: true };
            });
        }
        const path = `/sobjects/${type}/${externalIdField}/${record[externalIdField]}`;
        const body = { ...record, Id: undefined };
        delete body[externalIdField];
        return this.vpatch<any>({
            path: path,
            body: body,
            resolveWithFullResponse: true
        }).then(response => {
            if(response.ok) {
                if(response.status === 201) {
                    return response.json().then(createResult => {
                        const r = createResult as IUpsertResult;
                        r.created = true;
                        return r;
                    });
                }
                return { success: true };
            }
            return response.json().then(error => {
                throw {
                    status: response.status,
                    statusText: response.statusText,
                    error: error
                };
            });
            
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

