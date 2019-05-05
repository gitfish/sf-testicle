import { createAccess, IJwtSessionOptions } from "./jwt";
import { program } from "./jwt.sample.program";

createAccess(program as IJwtSessionOptions).then(result => {
    console.log("-- Result: " + JSON.stringify(result));
});