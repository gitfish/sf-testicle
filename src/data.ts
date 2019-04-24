import { IAccessSupplier, IAccess } from "./auth/core";
import "isomorphic-fetch";
import * as qs from "qs";
import { jsonResponseHandler, jsonResponseErrorHandler } from "./common";

interface IApiVersion {
    version?: string;
    label?: string;
    url?: string;
}

interface IConfig {
    apiVersion : IApiVersion;
}

const Defaults : IConfig = {
    apiVersion: {
        label: "Spring '19",
        url: "/services/data/v45.0",
        version: "45.0"
    }
};

interface IDataServiceOptions {
    access?: IAccess;
    accessSupplier?: IAccessSupplier;
    apiVersion?: IApiVersion;
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
    id?: string;
    errors?: IError[];
    success: boolean;
}

interface IUpsertResult extends ISaveResult {
    created?: boolean;
}

interface IRetrieveRequest {
    type: string;
    Id?: string;
    externalIdField?: string;
    fields: string[];
}

interface ISubRequest {
    binaryPartName?: string;
    binaryPartNameAlias?: string;
    method?: string;
    richInput?: any;
    url?: string;
    [key : string] : any;
}

interface IDataService {
    getApiVersion() : Promise<IApiVersion>;
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
    private _access : IAccess;
    private _accessPromise : Promise<IAccess>;
    private _apiVersion : IApiVersion;
    private _apiVersionsPromise : Promise<IApiVersion[]>;
    private _apiVersionPromise : Promise<IApiVersion>;
    
    constructor(opts?: IDataServiceOptions) {
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
    protected get accessPromise() : Promise<IAccess> {
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
    protected get apiVersionsPromise() : Promise<IApiVersion[]> {
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
    protected get apiVersionPromise() : Promise<IApiVersion> {
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
                    return Defaults.apiVersion;
                });
            }
        }
        return this._apiVersionPromise;
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
    getApiVersion() : Promise<IApiVersion> {
        return this.apiVersionPromise;
    }
    query(soql : string) : Promise<IQueryResult> {
        return this.get({
            path: "/query/",
            qs: {
                q: soql
            }
        });
    }
    explain(soql : string) : Promise<IQueryExplainResult> {
        return this.get({
            path: "/query/",
            qs: {
                explain: soql
            }
        });
    }
    queryAll(soql : string) : Promise<IQueryResult> {
        return this.get({
            path: "/queryAll/",
            qs: {
                q: soql
            }
        });
    }
    search(sosl : string) : Promise<ISearchResult> {
        return this.get({
            path: "/search/",
            qs: {
                q: sosl
            }
        });
    }
    parameterizedSearch(request : IParameterizedSearchRequest) : Promise<ISearchResult> {
        return this.post({
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
        return this.post({
            path: `/sobjects/${this.getSObjectType(record)}/`,
            body: { ...record, attributes: undefined }
        });
    }
    update(record : IRecord) : Promise<any> {
        return this.patch({
            path: `/sobjects/${this.getSObjectType(record)}/${record.Id}`,
            body: { ...record, Id: undefined, attributes: undefined },
            resolveWithFullResponse: true
        }).then(response => {
            if(!response.ok) {
                return jsonResponseErrorHandler(response);
            }
        });
    }
    delete(record : IRecord) : Promise<any> {
        return this.del({
            path: `/sobjects/${this.getSObjectType(record)}/${record.Id}`,
            resolveWithFullResponse: true
        });
    }
    retrieve(request : IRetrieveRequest) : Promise<IRecord> {
        const path = request.externalIdField ?
            `/sobjects/${request.type}/${request.externalIdField}/${request.Id}` :
            `/sobjects/${request.type}/${request.Id}`;
        return this.get({
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
        return this.patch({
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
            return jsonResponseErrorHandler(response);
        });
    }
}

export {
    IDataService,
    DataService,
    IDataServiceOptions,
    IConfig,
    Defaults,
    IApiVersion,
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

