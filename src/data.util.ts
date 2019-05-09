import { IBatchRequest, IDataService, IBatchResponse, IDataOperationsHandler, BaseDataOperations, IDataOperations, IBatchSubrequest, IQueryRequest, IQueryResult, IRecord } from "./data";
import * as qs from "qs";

const Config = {
    batchLimit: 25
};

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

interface IBatchIOResult {
    request?: IBatchRequest;
    response?: IBatchResponse;
}

const batch = (dataService : IDataService, opsHandler : IDataOperationsHandler) : Promise<IBatchIOResult> => {
    return dataService.getApiVersion().then(apiVersion => {
        const b = new BatchRequestBuilder(apiVersion.version);
        opsHandler(b);
        const request = b.request;
        
        const ios : IBatchIOResult[] = [];
        const subRequests = request.batchRequests.concat([]);
        // split our requests if necessary
        if(subRequests.length > Config.batchLimit) {
            while(subRequests.length > 0) {
                ios.push({
                    request: {
                        batchRequests: subRequests.splice(0, Config.batchLimit)
                    }
                });
            }
        } else {
            ios.push({ request: request });
        }
        return Promise.all(ios.map(io => {
            return dataService.batch(io.request).then(response => {
                io.response = response;
            });
        })).then(() => {
            const mergedResponse : IBatchIOResult = { request: request, response: { hasErrors: false, results: [] } };
            ios.forEach(io => {
                mergedResponse.response.hasErrors = mergedResponse.response.hasErrors || io.response.hasErrors;
                mergedResponse.response.results = mergedResponse.response.results.concat(io.response.results);
            });
            return mergedResponse;
        });
        
    });
}

interface IQueryIteratorOptions extends IQueryRequest {
    dataService: IDataService;
    all?: boolean;
}

async function* queryIterator(opts : IQueryIteratorOptions) {
    const { dataService } = opts;
    let qr : IQueryResult;
    let idx = 0;
    const nextRecord = async () : Promise<IRecord> => {
        if(!qr) {
            qr = await dataService.query(opts);
            idx = 0;
        } else {
            if(idx >= qr.records.length) {
                if(qr.done) {
                    qr = null;
                } else {
                    qr = await dataService.queryNext({ ...qr, batchSize: opts.batchSize });
                    idx = 0;
                }
            }
        }
        if(qr && qr.records && idx < qr.records.length) {
            const recordIdx = idx;
            idx ++;
            return qr.records[recordIdx];
        }
        return null;
    }
    while(true) {
        const record = await nextRecord();
        if(record) {
            yield record;
        } else {
            return;
        }
    }
}

export {
    queryIterator,
    batch,
    BatchRequestBuilder,
    IBatchIOResult
}