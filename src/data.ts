import "isomorphic-fetch";
import { jsonResponseErrorHandler, IApiVersion, IRestServiceConfig } from "./common";
import * as qs from "qs";
import { RestService } from "./common";

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

interface IBatchSubrequest {
    binaryPartName?: string;
    binaryPartNameAlias?: string;
    method?: string;
    richInput?: any;
    url?: string;
    [key : string] : any;
}

interface IBatchSubrequestResult {
    result?: any;
    statusCode?: Number;
}

interface IBatchRequest {
    batchRequests?: IBatchSubrequest[];
}

interface IBatchResponse {
    hasErrors?: boolean;
    results?: IBatchSubrequestResult[];
}

interface IGetDeletedRequest {
    type: string;
    start?: string | Date;
    end: string | Date;
}

interface IGetDeletedResponse {
    deletedRecords?: IRecord[];
    earliestDateAvailable?: string;
    latestDateCovered?: string;
}

interface IGetUpdatedRequest {
    type: string;
    start?: string | Date;
    end: string | Date;
}

interface IGetUpdatedResponse {
    ids?: string[];
    latestDateCovered?: string;
}

interface ILimit {
    Max: number;
    Remaining: number;
}

interface ILimitsResponse {
    [key : string] : ILimit;
}

interface ISObjectBasicInformation {
    activateable?: boolean;
    custom?: boolean;
    customSetting?: boolean;
    createable?: boolean;
    deletable?: boolean;
    deprecatedAndHidden?: boolean;
    feedEnabled?: boolean;
    keyPrefix?: string;
    label?: string;
    labelPlural?: string;
    layoutable?: boolean;
    mergeable?: boolean;
    mruEnabled?: boolean;
    name?: string;
    queryable?: boolean;
    replicateable?: boolean;
    retrieveable?: boolean;
    searchable?: boolean;
    triggerable?: boolean;
    undeletable?: boolean;
    updateable?: boolean;
    urls?: {
        [key : string] : string;
    };
}

interface IGlobalSObjectDescribeResult {
    encoding?: string;
    maxBatchSize?: number;
    sobjects: ISObjectBasicInformation[];
}

interface ISObjectDescribeBasicResult {
    objectDescribe?: ISObjectBasicInformation;
    recentItems?: IRecord[];
}

interface ISObjectDescribeResult extends ISObjectBasicInformation {
    [key : string] : any;
}

const getRequestDate = (value : string | Date) : string => {
    if(value) {
        if(typeof(value) !== "string") {
            let r = value.toISOString();
            const dotIndex = r.lastIndexOf(".");
            if(dotIndex > 0) {
                r = r.substring(0, dotIndex) + r.substring(dotIndex + 4);
            }
            return r;
        }
        return value as string;
    }
    return undefined;
};

interface IDataOperations {
    getLimits() : Promise<ILimitsResponse>;
    describeGlobal() : Promise<IGlobalSObjectDescribeResult>;
    describeBasic(type : string) : Promise<ISObjectDescribeBasicResult>;
    describe(type : string) : Promise<ISObjectDescribeResult>;
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
    getDeleted(request : IGetDeletedRequest) : Promise<IGetDeletedResponse>;
    getUpdated(request : IGetUpdatedRequest) : Promise<IGetUpdatedResponse>;
}

class BaseDataOperations implements IDataOperations {
    fetch(opts : any) : Promise<any> {
        return Promise.reject({
            code: "NOT_IMPLEMENTED",
            message: "Fetch has not been implemented"
        })
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
    describeGlobal() {
        return this.get({
            path: "/sobjects/"
        });
    }
    describeBasic(type : string) : Promise<ISObjectDescribeBasicResult> {
        return this.get({
            path: `/sobjects/${type}/`
        });
    }
    describe(type : string) : Promise<ISObjectDescribeResult> {
        return this.get({
            path: `/sobjects/${type}/describe/`
        });
    }
    getLimits() {
        return this.get({
            path: "/limits/"
        });
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
    getSObjectType(record : IRecord) {
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
    protected upsertRaw(record : IRecord, externalIdField?: string) : Promise<any> {
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
        });
    }
    upsert(record : IRecord, externalIdField?: string) : Promise<IUpsertResult> {
        return this.upsertRaw(record, externalIdField);
    }
    getDeleted(request : IGetDeletedRequest) : Promise<IGetDeletedResponse> {
        const start = getRequestDate(request.start);
        const end = getRequestDate(request.end);
        
        console.log("-- Start Date: " + start);
        console.log("-- End Date: " + end);
        return this.get({
            path: `/sobjects/${request.type}/deleted/`,
            qs: {
                start: start,
                end: end
            }
        });
    }
    getUpdated(request : IGetUpdatedRequest) : Promise<IGetUpdatedResponse> {
        const start = getRequestDate(request.start);
        const end = getRequestDate(request.end);
        return this.get({
            path: `/sobjects/${request.type}/updated/`,
            qs: {
                start: start,
                end: end
            }
        });
    }
}

interface IDataOperationsHandler {
    (ops : IDataOperations) : void;
}

class BatchRequestBuilder extends BaseDataOperations implements IDataOperations {
    private subrequests : IBatchSubrequest[] = [];
    private version : string;
    constructor(version : string) {
        super();
        this.version = version;
    }
    fetch(opts : any) : Promise<any> {
        let url = `v${this.version}${opts.path}`;
        if(opts.qs) {
            url += `?${qs.stringify(opts.qs)}`;
        }
        const subrequest : IBatchSubrequest = {
            url: url,
            method: opts.method ? opts.method : opts.body ? "POST" : "GET",
            richInput: opts.body
        };
        this.subrequests.push(subrequest);
        return Promise.resolve();
    }
    get request() : IBatchRequest {
        return {
            batchRequests: this.subrequests.map(r => {
                return {...r};
            })
        };
    }
}



interface IDataService extends IDataOperations {
    getApiVersion() : Promise<IApiVersion>;
    batch(request : IBatchRequest) : Promise<IBatchResponse>;
}

class RestDataService extends BaseDataOperations implements IDataService {
    private rest : RestService;
    
    constructor(opts?: IRestServiceConfig) {
        super();
        this.rest = new RestService(opts);
    }
    public getApiVersion() : Promise<IApiVersion> {
        return this.rest.getApiVersion();
    }
    public fetch(opts : any) : Promise<any> {
        return this.rest.fetch(opts);
    }
    upsert(record : IRecord, externalIdField?: string) : Promise<IUpsertResult> {
        return this.upsertRaw(record, externalIdField).then(response => {
            if(response.ok) {
                if(response.status === 201) {
                    return response.json().then(createResult => {
                        const r = createResult as IUpsertResult;
                        r.created = true;
                        return r;
                    });
                }
                return { success: true, created: false };
            }
            return jsonResponseErrorHandler(response);
        });
    }
    batch(request : IBatchRequest) : Promise<IBatchResponse> {
        return this.post({
            path: "/composite/batch",
            body: request
        });
    }
}

const batchOps = (dataService : IDataService, opsHandler : IDataOperationsHandler) : Promise<{ request: IBatchRequest, response: IBatchResponse }> => {
    return dataService.getApiVersion().then(apiVersion => {
        const b = new BatchRequestBuilder(apiVersion.version);
        opsHandler(b);
        const request = b.request;
        return dataService.batch(request).then(response => {
            return {
                request: request,
                response: response
            };
        });
    });
}

export {
    IDataOperations,
    IDataService,
    RestDataService,
    IApiVersion,
    IRecordAttributes,
    IRecord,
    IQueryResult,
    IQueryPlanFeedbackNote,
    IQueryPlan,
    IQueryExplainResult,
    ISearchSObjectSpec,
    IParameterizedSearchRequest,
    ISearchResult,
    BatchRequestBuilder,
    batchOps
}

