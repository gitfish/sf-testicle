import { createAccess, IPasswordSessionOptions } from "./password";
import { program } from "./password.sample.program";

createAccess(program as IPasswordSessionOptions).then(result => {
    console.log("-- Result: " + JSON.stringify(result));
});