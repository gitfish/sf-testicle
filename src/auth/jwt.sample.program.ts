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

export {
    program
}