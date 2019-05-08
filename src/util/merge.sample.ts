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
}).catch(ex => {
    console.log("-- Merge Error");
    console.error(ex);
});
