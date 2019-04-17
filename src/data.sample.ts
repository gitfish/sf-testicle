import { createAccessSupplier } from "./auth/jwt";
import { DataService } from "./data";

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAsDRlzSwIY2ppuv2hjXsGWBcCUY27tGk5TKIzNcMs2bk77DP3
itNi52kZb2d3qdNSZC8bGr9fGOGuHMSBpf+2TRgPxKZ+F25PvLnfU3Oh+w5I6vhN
zsqiIpqlrslRTXV23MZM0MiV50akkGTiOrdo4ATGuKBmY5kOuVZr8V46vA+40dkI
rsVejYoorpht3V2HPtadQbRj5TstB9caU4PEIlEiC0Y7r9OOS2BCApDv8tykbSPo
eXpazvUPnGGHxORpznhozY6C4X3LD3nBjhSGwdctXNxml2E2j27WyZqQXhgOdOk8
b0y272BY8gU6m5sX+UnKot2pDQsX8tSK3M1+JwIDAQABAoIBAFb1VPQ/cdhWUN2m
hA8FkujwWgWTc/oiH9QRDELREpZUkx0LvHO3xMy9kn7nSif2kWe905uMrErkPYAW
/oDExNwhLs72961qlFFoTa2qmFsE/rlvVz7hw8heF7w9wDEA8mscNhanl0svEtHr
57XghBJiaQv+pOksRRb0bosM3OGn8rdMH/dfcbOflM23mGFLBodsDO6KJYrl5X6p
rIGvLLz9fGQ3XpHJF2DO5Uc2CjBe9MLjDu7SqkDlxuDXGvvYuElOCDYt5nPhSZe6
KzGbyOVKx1/5xYLtT2HcVZSZgbuPoRPuA5rFp6UVB7dgz1rcV/TTJ60iy14Y6AeP
95tMgDECgYEA4CQuRGUOjmCIVk1WRQWVeZNvpKxUc4f0XVLtE9IFt+jiUYnD3xEZ
Wihq6STGTULln5gCQqsP/VH/wtAt/sY4bZaEy8gijzIzXaT1tufeXgSNcyMaxhRH
9yPXBV8Uwo7tP7jiWbhvtysTUHznq0cn4nl91A/7zCYRx4axZ6PrPFkCgYEAyT/y
yOH5i5ksZufQIAS0ZsZdVeH6ICXX4JXWgVqryT6147vy4KLAPdtvUa22XJJWWx3v
vniMDzXtZP9RSiQSwzSZ2fNNkYnapVIbeZ0X7VnyiWQZ7r1xUz8UltASz1QTYazM
IpNUf7Wi/kZ9sxPNKIZhmmxU6+0TBYaEvPLFPn8CgYEAoOTX4Xi5TjK1K14wgzNS
7QaMqaSaqqP5IdSZIhUszat6ahV+aO2ZSUKiG+GuB1/x/PHdDYZF4A2wjmNp4Ozh
LKlTggST6j6a6Km1SCqBUPPrpa6ZVX7RefJcMxrhiBeY7pkEwmrGprFhF/HRSv20
/7k+Pa+LjCv3r0ZcqozcG2ECgYALebsFW2VYYXaXs5Y5jSsgRSVjVUxm8uF5a/Hc
VGhBRHMotjnmN0GRBWc2mBoy8yE7dtyJ1uPdpiyQOsLO4Hm1adVwCSCeMOcn0CPC
7oNDxIJA9VVJOMIyhgFNjDXWXqvwQOMvAYmq8peFuk1GndVv/yGnpY++GDmicgY1
o/49TwKBgDTnSYCCwQRvVudZujP8gYL8o/jPkuj4wgLm4NSIIkXpYFOrWxTcP3LD
ykfoJagNArz3HJz7+D7H+SOaLZ9D9SnkwgavrsTAmmvcRAlr94oxF1+AKnol3Uk4
TUYch/WUijOustZjlekf3sFGj56KvUWphcA26BFunFTDlJoW95+m
-----END RSA PRIVATE KEY-----
`;

const accessSupplier = createAccessSupplier({
    username: "mfisher@dev.one",
    clientId: "3MVG9pe2TCoA1Pf6I1c1KhtCP9xk.9gbX9NP41gdQDTtVvfUOJPg8P1PnrGJ4wd7y1eAEIin9epeViKJJqXy7",
    privateKey: privateKey
});

const dataService = new DataService({
    accessSupplier: accessSupplier
});

const sample = async () => {
    const versionInfo = await dataService.getVersionInfo();
    console.log("-- Version Info: " + JSON.stringify(versionInfo));

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
    });;

    console.log("-- Parameterized Search Result: " + JSON.stringify(psr));
};

sample();
