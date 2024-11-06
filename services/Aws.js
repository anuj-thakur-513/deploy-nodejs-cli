const {
  EC2Client,
  RunInstancesCommand,
  DescribeInstancesCommand,
  waitUntilInstanceStatusOk,
} = require("@aws-sdk/client-ec2");
const {
  SSMClient,
  SendCommandCommand,
  GetCommandInvocationCommand,
} = require("@aws-sdk/client-ssm");
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
        region: aws.region,
        credentials: fromEnv(),
      });
      Aws.#ssmClient = new SSMClient({
        region: aws.region,
        credentials: fromEnv(),
      });
    }
    return Aws.#instance;
  }

  async createInstance(title = null, instanceType = "t2.micro") {
    try {
      const params = {
        ImageId: aws.ami,
        InstanceType: instanceType,
        MinCount: 1,
        MaxCount: 1,
        SecurityGroupIds: [aws.securityGroup],
        TagSpecifications: [],
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
        "cd /root",
        "sudo apt update -y && sudo apt upgrade -y",
        "sudo apt install -y nodejs",
        "sudo apt install -y npm",
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
      const commandId = res.Command.CommandId;
      console.log(`sent command ${commandId} to setup the instance`);
      let status;
      do {
        const invocationParams = {
          CommandId: commandId,
          InstanceId: instanceId,
        };

        const invocation = await Aws.#ssmClient.send(
          new GetCommandInvocationCommand(invocationParams)
        );
        status = invocation.Status;

        if (status === "Success") {
          console.log("Commands executed successfully");
          return res;
        }
        if (status === "Failed") {
          console.error("Commands failed to execute");
          return res;
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } while (status === "InProgress" || status === "Pending");
    } catch (error) {
      console.log("error setting up the environment for nodejs", error);
    }
  }

  async getCommandDetails(commandId, instanceId) {
    const params = {
      CommandId: commandId,
      InstanceId: instanceId,
    };
    try {
      const result = await Aws.#ssmClient.send(new GetCommandInvocationCommand(params));
      console.log(result);
    } catch (error) {
      console.log("error fetching command status", error);
    }
  }

  async deployProject(instanceId, repositoryUrl, isTypescript, env) {
    try {
      const projectName = extractProjectName(repositoryUrl);
      console.log("cloning", repositoryUrl);
      const commands = [
        "cd /root",
        `git clone ${repositoryUrl}`,
        `cd ${projectName}`,
        "touch .env",
        `echo "${env.join("\n")}" > .env`,
        "npm install",
      ];
      if (isTypescript) {
        commands.push(
          "npm i -g typescript",
          "tsc",
          "sudo pm2 start dist/index.js --name backend -i max"
        );
      } else {
        commands.push("sudo pm2 start src/index.js --name backend -i max");
      }

      console.log("cloning and deploying project");
      const params = {
        InstanceIds: [instanceId],
        DocumentName: "AWS-RunShellScript",
        Parameters: {
          commands: commands,
        },
      };

      const command = new SendCommandCommand(params);
      const res = await Aws.#ssmClient.send(command);
      const commandId = res.Command.CommandId;
      console.log(`sent command ${commandId} to deploy the project`);

      let status;
      do {
        const invocationParams = {
          CommandId: commandId,
          InstanceId: instanceId,
        };

        const invocation = await Aws.#ssmClient.send(
          new GetCommandInvocationCommand(invocationParams)
        );
        status = invocation.Status;

        if (status === "Success") {
          console.log("Commands executed successfully");
          return res;
        }
        if (status === "Failed") {
          console.error("Commands failed to execute");
          return res;
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } while (status === "InProgress" || status === "Pending");
    } catch (error) {
      console.log("error deploying the project", error);
    }
  }
}

module.exports = Aws;
