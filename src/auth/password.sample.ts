import { getAccess } from "./password";
import { IPasswordAccessRequest } from "./password";
import { program } from "./password.sample.program";

getAccess(program as IPasswordAccessRequest).then(result => {
    console.log("-- Result: " + JSON.stringify(result));
});