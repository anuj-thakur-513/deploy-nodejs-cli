#! /usr/bin/env node
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const yargs = require("yargs");
const chalk = require("chalk");
const boxen = require("boxen");
const Aws = require("../services/AWS");

const usage = chalk(
    "\nUsage: aws-deploy-nodejs -r <public_repository_url> -ts <true or false flag for typescript> -t <title_of_instance> -it <instance type, e.g. t2.micro> -i <instance_id>\n" +
        boxen(chalk.green("\nDeploys a nodejs project to AWS\n"), {
            padding: 1,
            borderColor: "green",
            dimBorder: true,
        })
);

const options = yargs
    .usage(usage)
    .options({
        r: {
            alias: "public_repository_url",
            describe: "enter the public github repository url",
            type: "string",
            demandOption: true,
        },
        ts: {
            alias: "is_typescript",
            describe: "enter true or false flag for typescript",
            type: "boolean",
            demandOption: true,
        },
        t: {
            alias: "title",
            describe: "enter title of the instance",
            type: "string",
            demandOption: false,
        },
        it: {
            alias: "instance_type",
            describe: "type of instance, if not provided, by default t2.micro will be created",
            type: "string",
            demandOption: false,
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
        const aws = Aws.getInstance();
        let { public_repository_url, is_typescript, title, instance_type, instance_id } = yargs.argv;
        if (!instance_id) {
            console.log("creating ec2 instance");
            let res;
            if (title && instance_type) {
                res = await aws.createInstance(title, instance_type);
            } else if (title) {
                res = await aws.createInstance(title);
            } else if (instance_type) {
                res = await aws.createInstance(null, instance_type);
            } else {
                res = await aws.createInstance();
            }
            instance_id = res.Instances[0].InstanceId;
            console.log("ec2 instance created");
        }
        console.log("setting up instance for node.js project");
        await aws.setupInstance(instance_id);
        console.log("instance setup successfull");
        console.log("cloning and deploying project");
        await aws.deployProject(instance_id, public_repository_url, is_typescript);
        console.log("project deployed successfully");

        const publicIp = await aws.getInstancePublicIp(instance_id);
        console.log(
            "\n" +
                boxen(
                    chalk.green.bold(
                        `\nProject Deployed Successfully on EC2\nInstance ID: ${instance_id}\nPublic IP: ${publicIp}`
                    ),
                    {
                        padding: 1,
                        borderColor: "green",
                        dimBorder: true,
                    }
                ) +
                "\n"
        );

        process.exit(0);
    } catch (error) {
        console.log(
            "\n" +
                boxen(chalk.red("\n" + error + "\n"), {
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
