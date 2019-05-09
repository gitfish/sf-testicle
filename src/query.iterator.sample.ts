import { createSession, IPasswordSessionOptions } from "./auth/password";
import { RestDataService } from "./data";
import { queryIterator } from "./data.util";
import { program } from "./auth/password.sample.program";

const session = createSession(program as IPasswordSessionOptions);

const dataService = new RestDataService({
    session: session
});

const sample = async () => {
    for await (const record of queryIterator({ dataService: dataService, query: "select Id,Name from Account", batchSize: 200 })) {
        console.log("-- Record: " + JSON.stringify(record));
    }
};

sample();