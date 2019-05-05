import { createSession, IJwtSessionOptions } from "./auth/jwt";
import { RestDataService } from "./data";
import { program } from "./auth/jwt.sample.program";

const session = createSession(program as IJwtSessionOptions);

const dataService = new RestDataService({
    session: session
});

const sample = async () => {
    try {
        const userInfo = await dataService.getUserInfo();
        console.log("-- User Info: " + JSON.stringify(userInfo));

        const apiVersion = await dataService.getApiVersion();
        console.log("-- Version Info: " + JSON.stringify(apiVersion));

        const limits = await dataService.getLimits();
        console.log(`-- Limits: ${JSON.stringify(limits)}`);

        const gd = await dataService.describeGlobal();
        console.log(`-- Global Describe Result: ${JSON.stringify(gd, null, "\t")}`);

        const accountBasicDescribe = await dataService.describeBasic("Account");
        console.log(`-- Account Basic Describe Result: ${JSON.stringify(accountBasicDescribe, null, "\t")}`);

        const accountDescribe = await dataService.describe("Account");
        console.log(`-- Account Describe Result: ${JSON.stringify(accountDescribe, null, "\t")}`);

        const dayMillis = 1000 * 60 * 60 * 24;

        const currentDate = new Date();
        const endDate = new Date(currentDate.getTime() - dayMillis);
        const startDate = new Date(currentDate.getTime() - (20 * dayMillis));

        console.log("-- Start Date: " + startDate);
        console.log("-- End Date: " + endDate);

        try {
            const deleted = await dataService.getDeleted({ type: "Contact", start: startDate, end: endDate });
            console.log(`-- Deleted: ${JSON.stringify(deleted)}`);
        } catch(error) {
            console.log("-- Error: " + error);
            console.error(error);
        }

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
        try {
            const upsertResult = await dataService.upsert(contact);
            console.log(`-- Upsert Result: ${JSON.stringify(upsertResult)}`);
        } catch(ex) {
            console.log("-- Upsert Error: " + ex);
            console.error(ex);
        }
        
        console.log("-- Upsert By Email Test");
        const upsertCreateResult = await dataService.upsert({ attributes: { type: "Contact" }, FirstName: "Sunburn", LastName: "Slapper", Email: "mfisher.au@hotmail.com"}, "Email");
        console.log("-- Upsert By Email New Result: " + JSON.stringify(upsertCreateResult));

        const upsertUpdateResult = await dataService.upsert({ attributes: { type: "Contact" }, FirstName: "Sunburn", LastName: "Fixer", Email: "mfisher.au@hotmail.com" }, "Email");
        console.log("-- Upsert by Email Update Result: " + JSON.stringify(upsertUpdateResult));

        try {
            await dataService.delete({ attributes: { type: "Contact" }, Id: upsertCreateResult.id });
            console.log("-- Deleted");
        } catch(ex) {
            console.log("-- Delete error: " + ex);
            console.error(ex);
        }

        try {
            await dataService.delete(contact);
            console.log("-- Deleted");
        } catch(ex) {
            console.log("-- Delete error: " + ex);
            console.error(ex);
        }

        const accountLayout = await dataService.describeLayout("Account");
        console.log("-- Acount Layouts: " + JSON.stringify(accountLayout));

        console.log("-- Type: " + typeof(accountLayout));

        const publisherLayouts = await dataService.describePublisherLayouts();

        console.log(`-- Publisher Layouts: ${JSON.stringify(publisherLayouts, null, "\t")}`);

        const recentlyViewed = await dataService.getRecentlyViewed(10);

        console.log("-- Recently Viewed: " + JSON.stringify(recentlyViewed, null, "\t"));

    } catch(ex) {
        console.log("-- Error: " + ex);
        console.error(ex);
    }
};

sample();
