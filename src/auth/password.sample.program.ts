import * as program from "commander";

program
    .option("-u, --username <username>", "Username")
    .option("-p, --password <password>", "Password")
    .option("-c, --client-id <client id>", "Client id")
    .option("-s, --client-secret <client secret>", "Client secret")
    .option("-l, --login-url <login url>", "Login Url")
    .parse(process.argv);

if(!program.username || !program.password || !program.clientId || !program.clientSecret) {
    program.outputHelp();
    process.exit(1);
};

export { program }