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
https://github.com/user-attachments/assets/e1cabe48-52f3-4bf6-8c10-0e3b76012030


## Contributions
- Fork the repo and clone it locally
- Setup the ```.env``` file and install the command globally
- Create a new branch for the feature you're going to add 
- Push your changes and raise a PR
