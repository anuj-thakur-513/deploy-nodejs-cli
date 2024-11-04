const {
    EC2Client,
    RunInstancesCommand,
    DescribeInstancesCommand,
    waitUntilInstanceStatusOk,
} = require("@aws-sdk/client-ec2");
const { SSMClient, SendCommandCommand } = require("@aws-sdk/client-ssm");
const { fromEnv } = require("@aws-sdk/credential-providers");

const { aws } = require("../config/keys");
const extractProjectName = require("../utils/extractProjectName");

class Aws {
    static #instance = null;
    static #ec2Client = null;
    static #ssmClient = null;

    static getInstance() {
        if (!Aws.#instance) {
            Aws.#instance = new Aws();
            Aws.#ec2Client = new EC2Client({
                region: "us-east-1",
                credentials: fromEnv(),
            });
            Aws.#ssmClient = new SSMClient({
                region: "us-east-1",
                credentials: fromEnv(),
            });
        }
        return Aws.#instance;
    }

    async createInstance(title = null, instanceType = "t2.micro") {
        try {
            // User data script to install SSM agent
            const userData = Buffer.from(
                `
                    #!/bin/bash
                    # Update package lists
                    apt-get update -y
                    
                    # Install necessary dependencies
                    apt-get install -y \
                        unzip \
                        wget \
                        curl
                    
                    # Install SSM agent for Ubuntu
                    snap install amazon-ssm-agent --classic
                    systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
                    systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
                    
                    # Install git
                    apt-get install -y git
                    
                    # Set up instance
                    apt-get upgrade -y
                `
            ).toString("base64");

            const params = {
                ImageId: aws.ami,
                InstanceType: instanceType,
                MinCount: 1,
                MaxCount: 1,
                SecurityGroupIds: [aws.securityGroup],
                TagSpecifications: [],
                UserData: userData,
                IamInstanceProfile: {
                    Name: aws.iamRole,
                },
            };

            if (title) {
                params.TagSpecifications.push({
                    ResourceType: "instance",
                    Tags: [
                        {
                            Key: "Name",
                            Value: title,
                        },
                    ],
                });
            }

            const createInstanceCommand = new RunInstancesCommand(params);
            const res = await Aws.#ec2Client.send(createInstanceCommand);
            return res;
        } catch (error) {
            console.log("error creating an ec2 instance", error);
        }
    }

    async getInstancePublicIp(instanceId) {
        try {
            const command = new DescribeInstancesCommand({
                InstanceIds: [instanceId],
            });
            const res = await Aws.#ec2Client.send(command);
            const instance = res.Reservations[0].Instances[0];
            return instance.PublicIpAddress;
        } catch (error) {
            console.log("error in fetching instance details", error);
        }
    }

    async setupInstance(instanceId) {
        try {
            console.log(`Waiting for instance ${instanceId} to be running`);
            await waitUntilInstanceStatusOk(
                { client: Aws.#ec2Client, maxWaitTime: 600 },
                { InstanceIds: [instanceId] }
            );
            console.log(`Instance ${instanceId} is up and running`);
            const commands = [
                "sudo apt update -y",
                "sudo apt upgrade -y",
                "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh",
                "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash",
                "source ~/.bashrc",
                "nvm install 20",
                "npm install -g pm2",
            ];

            const params = {
                InstanceIds: [instanceId],
                DocumentName: "AWS-RunShellScript",
                Parameters: {
                    commands: commands,
                },
            };

            const command = new SendCommandCommand(params);
            const res = await Aws.#ssmClient.send(command);
            return res;
        } catch (error) {
            console.log("error setting up the environment for nodejs", error);
        }
    }

    async deployProject(instanceId, repositoryUrl, isTypescript) {
        try {
            const projectName = extractProjectName(repositoryUrl);
            const commands = [`git clone ${repositoryUrl}`, `cd ${projectName}`, "npm install"];
            if (isTypescript) {
                commands.push("npm i -g typescript", "tsc", "pm2 start dist/index.js --name backend -i max");
            } else {
                commands.push("pm2 start src/index.js --name backend -i max");
            }

            const params = {
                InstanceIds: [instanceId],
                DocumentName: "AWS-RunShellScript",
                Parameters: {
                    commands: commands,
                },
            };

            const command = new SendCommandCommand(params);
            const res = await Aws.#ssmClient.send(command);
            return res;
        } catch (error) {
            console.log("error deploying the project", error);
        }
    }
}

module.exports = Aws;
