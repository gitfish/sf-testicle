import { createSession, IPasswordSessionOptions } from "../auth/password";
import { RestDataService } from "../data";
import { program } from "../auth/password.sample.program";
import { merge } from "./merge";

const session = createSession(program as IPasswordSessionOptions);

const dataService = new RestDataService({
    session: session
});

merge({
    dataService: dataService
}).then(result => {
    console.log("-- Batch Result Count: " + result.response.results.length);
    console.log("-- Batch Result: " + JSON.stringify(result.response.results));
}).catch(ex => {
    console.log("-- Merge Error");
    console.error(ex);
});
