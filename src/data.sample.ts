import { createAccessSupplier, IJwtAccessRequest } from "./auth/jwt";
import { DataService } from "./data";
import * as program from "commander";

program
    .option("-u, --username <username>", "Username")
    .option("-c, --client-id <client id>", "Client id")
    .option("-k, --private-key-path <private key path>", "Private key path")
    .parse(process.argv);

if(!program.username || !program.clientId || !program.privateKeyPath) {
    program.outputHelp();
    process.exit(1);
}

const accessSupplier = createAccessSupplier(program as IJwtAccessRequest);

const dataService = new DataService({
    accessSupplier: accessSupplier
});

const sample = async () => {
    const apiVersion = await dataService.getApiVersion();
    console.log("-- Version Info: " + JSON.stringify(apiVersion));

    const qr = await dataService.query("select Id,Name from User");
    console.log("-- Query Result: " + JSON.stringify(qr));

    const er = await dataService.explain("select Id,Name from User");
    console.log("-- Explain Result: " + JSON.stringify(er));

    const qar = await dataService.queryAll("select Id,Name from User");
    console.log("-- Query All Result: " + JSON.stringify(qar));

    const accounts = await dataService.query("select Id,Name,(select Id,Name from Contacts) from Account");
    console.log("-- Accounts: " + JSON.stringify(accounts));

    const sr = await dataService.search('FIND {trail*} IN ALL FIELDS returning Contact(Id,Name)');
    console.log("-- Search Result: " + JSON.stringify(sr));

    const psr = await dataService.parameterizedSearch({
        q: "trail*",
        fields: ["id", "firstName", "lastName"],
        sobjects: [
            {
                name: "Contact"
            }
        ],
        in: "ALL",
        overallLimit: 100,
        defaultLimit: 10
    });
    console.log("-- Parameterized Search Result: " + JSON.stringify(psr));


    try {
        const cr = await dataService.create({ attributes: { type: "Contact" }, firstName: "Lost", lastName: "Shoes", email: "mfisher.au@gmail.com" });
        console.log(`-- Create Result: ${JSON.stringify(cr)}`);
    
        // try out a certain failure
        try {
            const ecr = await dataService.create({ attributes: { type: "Contact" } });
            console.log(`-- Create error: ${JSON.stringify(ecr)}`)
        } catch(ex) {
            console.log("-- Error Creating empty: " + JSON.stringify(ex));
        }

        const contact = await dataService.retrieve({ type: "Contact", Id: cr.id, fields: ["firstName", "lastName"] });
        console.log("-- Contact: " + JSON.stringify(contact));

        contact.lastName = "Pants";
        await dataService.update(contact);
        console.log("-- Updated Contact");
        
        console.log("-- Upsert Test");
        await dataService.upsert(contact);
        
        console.log("-- Upsert By Email Test");
        const upsertCreateResult = await dataService.upsert({ attributes: { type: "Contact" }, FirstName: "Sunburn", LastName: "Slapper", Email: "mfisher.au@hotmail.com"}, "Email");
        console.log("-- Upsert By Email New Result: " + JSON.stringify(upsertCreateResult));

        const upsertUpdateResult = await dataService.upsert({ attributes: { type: "Contact" }, FirstName: "Sunburn", LastName: "Fixer", Email: "mfisher.au@hotmail.com" }, "Email");
        console.log("-- Upsert by Email Update Result: " + JSON.stringify(upsertUpdateResult));

        try {
            await dataService.delete({ attributes: { type: "Contact" }, Id: upsertCreateResult.id });
            console.log("-- Deleted");
        } catch(ex) {
            console.log("-- Delete error: " + JSON.stringify(ex));
        }

        try {
            await dataService.delete(contact);
            console.log("-- Deleted");
        } catch(ex) {
            console.log("-- Delete error: " + JSON.stringify(ex));
        }
        
    } catch(ex) {
        console.log("-- Error: " + JSON.stringify(ex));
    }
};

sample();
