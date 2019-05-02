import { createAccessSupplier, IJwtAccessRequest } from "./auth/jwt";
import { RestDataService, batchOps } from "./data";
import { program } from "./auth/jwt.sample.program";

const accessSupplier = createAccessSupplier(program as IJwtAccessRequest);

const dataService = new RestDataService({
    accessSupplier: accessSupplier
});

const sample = async () => {
    try {
        const result = await batchOps(dataService, ops => {
            ops.create({
                attributes: {
                    type: "Contact"
                },
                firstName: "Sea",
                lastName: "Gull",
                email: "sea.gull@rubbish.com"
            });
            ops.create({
                attributes: {
                    type: "Contact"
                },
                firstName: "Brown",
                lastName: "Bear",
                email: "brown.bear@rubbish.com"
            });
        });

        console.log(`-- Request: ${JSON.stringify(result.request)}`);
        console.log(`-- Result: ${JSON.stringify(result.response)}`);
    } catch(error) {
        console.log("-- Error: " + error);
        console.error(error);
    }

    
};

sample();