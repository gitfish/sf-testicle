import { IDataService, IRecord, IQueryResult, batchOps } from "../data";

interface IMergeOptions {
    dataService: IDataService;
}

interface IKeyAccountMap {
    [key : string] : IRecord;
}

// TODO: make this generic - currently serves a specific purpose
const merge = async (opts : IMergeOptions) => {
    const { dataService } = opts;

    const userInfo = await dataService.getUserInfo();
    console.log(`-- User Info: ${JSON.stringify(userInfo, null, "\t")}`);

    const queryResult = await dataService.query("select Id,(select Id,AccountId from Contacts),Name,Location_Group__c,Post_Location__c,Post__c from Account where Post_Location__c = 'Canberra' and Post__c = 'CHCH'");
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
        const batchResult = await batchOps(dataService, ops => {
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
        console.log("-- Batch Result:");
        console.log(JSON.stringify(batchResult, null, "\t"));
    }
};

export {
    merge
}