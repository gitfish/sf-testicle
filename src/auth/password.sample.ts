import { getAccess } from "./password";
import * as program from "commander";
import { IPasswordAccessRequest } from "./password";

program
    .option("-u, --username <username>", "Username")
    .option("-p, --password <password>", "Password")
    .option("-c, --client-id <client id>", "Client id")
    .option("-s --client-secret <client secret>", "Client secret")
    .parse(process.argv);

if(!program.username || !program.password || !program.clientId || !program.clientSecret) {
    program.outputHelp();
    process.exit(1);
};

getAccess(program as IPasswordAccessRequest).then(result => {
    console.log("-- Result: " + JSON.stringify(result));
});