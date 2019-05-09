import { IDataService, IRecord, IQueryResult } from "../data";
import { batch, IBatchIOResult } from "../data.util";

interface IMergeOptions {
    dataService: IDataService;
}

interface IKeyAccountMap {
    [key : string] : IRecord;
}

// TODO: make this generic - currently serves a specific purpose
const merge = async (opts : IMergeOptions) : Promise<IBatchIOResult> => {
    const { dataService } = opts;

    const queryResult = await dataService.query("select Id,(select Id,AccountId from Contacts),Name,Location_Group__c,Post_Location__c,Post__c from Account");
    const keyAccountMap : IKeyAccountMap = {};
    const updatedContacts = [];
    const forDelete = [];

    const mergeAccountContacts = async (queryResult : IQueryResult, accountId : string) => {
        if(queryResult && queryResult.records && queryResult.records.length > 0) {
            queryResult.records.forEach(contact => {
                if(contact.AccountId !== accountId) {
                    contact.AccountId = accountId;
                    updatedContacts.push(contact);
                }
            });

            if(!queryResult.done) {
                const nextQueryResult = await dataService.queryNext(queryResult);
                return mergeAccounts(nextQueryResult);
            }
        }
    };

    const mergeAccounts = async (queryResult : IQueryResult) => {
        if(queryResult && queryResult.records && queryResult.records.length > 0) {
            const recordHandler = async (account : IRecord) => {
                const contacts : IQueryResult = account.Contacts;
                if(contacts && contacts.totalSize > 0) {
                    const key = (account.Name + account.Location_Group__c + account.Post_Location__c + account.Post__c).toLowerCase();
                    let mr = keyAccountMap[key];
                    if(!mr) {
                        keyAccountMap[key] = account;
                    } else {
                        await mergeAccountContacts(contacts, mr.Id);
                    }
                } else {
                    forDelete.push(account);
                }
            };
            await Promise.all(queryResult.records.map(recordHandler));

            if(!queryResult.done) {
                const nextQueryResult = await dataService.queryNext(queryResult);
                return mergeAccounts(nextQueryResult);
            }
        }
    };

    
    await mergeAccounts(queryResult);

    // go ahead and update contacts
    if(updatedContacts.length > 0 || forDelete.length > 0) {
        return batch(dataService, ops => {
            if(updatedContacts.length > 0) {
                updatedContacts.forEach(contact => {
                    ops.update(contact);
                });
            }
            if(forDelete.length > 0) {
                forDelete.forEach(a => {
                    ops.delete(a);
                });
            }
        });
    }

    return {
        request: {
            batchRequests: []
        },
        response: {
            hasErrors: false,
            results: []
        }
    };
};

export {
    merge
}