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
