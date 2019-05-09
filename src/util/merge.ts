import { IDataService, IRecord, IQueryResult } from "../data";
import { batch, IBatchIOResult, queryIterator } from "../data.util";

interface IMergeOptions {
    dataService: IDataService;
}

interface IKeyAccountMap {
    [key : string] : IRecord;
}

// TODO: make this generic - currently serves a specific purpose
const merge = async (opts : IMergeOptions) : Promise<IBatchIOResult> => {
    const { dataService } = opts;

    const keyAccountMap : IKeyAccountMap = {};
    const updatedContacts = [];
    const accountsForDelete = [];

    const mergeAccountContacts = async (queryResult : IQueryResult, accountId : string) => {
        for await (const contact of queryIterator({ queryResult: queryResult, dataService: dataService })) {
            if(contact.AccountId !== accountId) {
                contact.AccountId = accountId;
                updatedContacts.push(contact);
                console.log("=========== Updated Contact: " + JSON.stringify(contact));
            }
        }
    };

    for await (const account of queryIterator({ dataService: dataService, query: "select Id,(select Id,AccountId from Contacts),Name,Location_Group__c,Post_Location__c,Post__c from Account" })) {
        const contactsResult : IQueryResult = account.Contacts;
        if(contactsResult && contactsResult.totalSize > 0) {
            const key = (account.Name + account.Location_Group__c + account.Post_Location__c + account.Post__c).toLowerCase();
            const master = keyAccountMap[key];
            if(!master) {
                keyAccountMap[key] = account;
            } else {
                //contactMergePromises.push(mergeAccountContacts(contactsResult, master.Id));
                await mergeAccountContacts(contactsResult, master.Id);
            }
        } else {
            accountsForDelete.push(account);
        }
    }

    // go ahead and update contacts
    if(updatedContacts.length > 0 || accountsForDelete.length > 0) {
        return batch(dataService, ops => {
            if(updatedContacts.length > 0) {
                updatedContacts.forEach(contact => {
                    ops.update(contact);
                });
            }
            if(accountsForDelete.length > 0) {
                accountsForDelete.forEach(a => {
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