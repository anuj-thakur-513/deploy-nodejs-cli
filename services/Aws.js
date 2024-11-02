const { EC2Client, RunInstancesCommand, StartInstancesCommand } = require("@aws-sdk/client-ec2");
const { SSMClient, SendCommandCommand } = require("@aws-sdk/client-ssm");
const { fromEnv } = require("@aws-sdk/credential-providers");

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

    async createInstance(title, instanceType, instanceId = null) {
        const createInstanceCommand = new StartInstancesCommand({
            
        })
    }
}

module.exports = Aws;
