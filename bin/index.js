#! /usr/bin/env node
const yargs = require("yargs");
const chalk = require("chalk");
const boxen = require("boxen");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const usage = chalk(
    "\nUsage: aws-deploy-nodejs -t <title_of_instance> -it <instance type, e.g. t2.micro> -i <instance_id>\n" +
        boxen(chalk.green("\nDeploys a nodejs project to a specified AWS instance or a new AWS instance\n"), {
            padding: 1,
            borderColor: "green",
            dimBorder: true,
        })
);

const options = yargs
    .usage(usage)
    .options({
        t: {
            alias: "title",
            describe: "enter title of the instance",
            type: "string",
            demandOption: true,
        },
        it: {
            alias: "instance_type",
            describe: "type of instance, e.g. t2.micro",
            type: "string",
            demandOption: true,
        },
        i: {
            alias: "instance_id",
            describe: "enter the instance id if to be deployed on a specific instance",
            type: "string",
            demandOption: false,
        },
    })
    .help(true).argv;

const main = async () => {
    try {
        
        process.exit(0);
    } catch (error) {
        console.log(
            "\n" +
                boxen(chalk.green("\n" + error + "\n"), {
                    padding: 1,
                    borderColor: "red",
                    dimBorder: true,
                }) +
                "\n"
        );
        process.exit(1);
    }
};

main();
