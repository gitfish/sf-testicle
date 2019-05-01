import { getAccess } from "./jwt";
import { IJwtAccessRequest } from "./jwt";
import { program } from "./jwt.sample.program";

getAccess(program as IJwtAccessRequest).then(result => {
    console.log("-- Result: " + JSON.stringify(result));
});