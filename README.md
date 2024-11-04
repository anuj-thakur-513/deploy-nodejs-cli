# aws-deploy-nodejs

A CLI tool which allows you to directly deploy your personal projects to an EC2 instance. Either create a new instance or pass the instance-id to deploy on an already existing instance.

Steps to use:
- Create an IAM User with following permissions (generate an access key for this user):
    - AmazonEC2FullAccess
    - AmazonSSMFullAccess
    - AmazonSSMManagedInstanceCore
    - AmazonIAMFullAccess

- Create an IAM Profile with following permissions:
    - AmazonEC2FullAccess
    - AmazonSSMFullAccess
    - AmazonSSMManagedInstanceCore
    - AmazonEC2RoleforSSM

- If you want to host on an already existing instance, attach the IAM profile to that instance otherwise nothing required

- Create a Security group which exposes the desired ports in the inbound rules or just expose the ports that you want to expose

- Replace ```.env.sample``` with ```.env``` and add all the values

- ```npm install```
- ```npm i -g .```
- ```aws-deploy-nodejs --help```

## Command Use
![](/github_assets/aws-deploy-nodejs%20help.jpg)

![](/github_assets/aws-deploy-nodejs%20success.jpg)


## Demo Video
![](/github_assets/AWS%20Deploy%20nodejs%20CLI.mov)