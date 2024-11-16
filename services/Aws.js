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
      process.exit(1);
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
        "sudo apt install -y nginx",
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
      process.exit(1);
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

  async cloneRepo(instanceId, repositoryUrl, env) {
    try {
      const projectName = extractProjectName(repositoryUrl);
      console.log("cloning", repositoryUrl);
      const commands = [
        "cd /root",
        `git clone ${repositoryUrl}`,
        `cd ${projectName}`,
        "npm install",
        "npm i -g typescript",
      ];

      if (env) {
        commands.push("touch .env", `echo "${env.join("\n")}" > .env`);
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
      const commandId = res.Command.CommandId;
      console.log(`sent command ${commandId} to clone ${repositoryUrl}`);

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
      console.log(`error while cloning ${repositoryUrl}`, error);
      process.exit(1);
    }
  }

  async deployBackend(instanceId, repositoryUrl, isTypescript, env) {
    try {
      const projectName = extractProjectName(repositoryUrl);
      console.log("cloning", repositoryUrl);
      const commands = [`cd /root/${projectName}`];
      if (isTypescript) {
        commands.push("tsc", "sudo pm2 start dist/index.js --name backend -i max");
      } else {
        commands.push("sudo pm2 start src/index.js --name backend -i max");
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
      process.exit(1);
    }
  }

  async deployFrontend(instanceId, repositoryUrl, env) {
    try {
      const projectName = extractProjectName(repositoryUrl);
      const nginxDir = projectName + "-frontend";
      const commands = [
        "cd /root",
        `sudo mkdir /var/www/${nginxDir}`,
        `cd ${projectName}`,
        `npm run build`,
        `sudo cp -R dist/* /var/www/${nginxDir}/`,
        "cd /root",
        // sed is used to search and replace strings in a file
        // TODO: fix this sed command, this is not working yet (Will continue working on this tomorrow)
        `sudo sed -i '/include \\/etc\\/nginx\\/sites-enabled\\/\\*;/ s/^/# /' /etc/nginx/nginx.conf`,
        `touch /etc/nginx/conf.d/${nginxDir}.conf`,
        // adding configuration for nginx frontend
        `echo 'server {
        listen 80;
        listen [::]:80;
        root /var/www/${nginxDir};

        location / {
          try_files $uri $uri/ /index.html;
        }
        }' | sudo tee /etc/nginx/conf.d/${nginxDir}.conf > /dev/null`,
        // test NGINX config && restart NGINX server
        "sudo systemctl daemon-reload",
        "sudo nginx -t && sudo systemctl reload nginx",
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
      console.log(`sent command ${commandId} to deploy frontend`);
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
      console.log("error while deploying frontend", error);
      process.exit(1);
    }
  }
}

module.exports = Aws;
