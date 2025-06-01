# Infrastructure Documentation for Task Management App

This Terraform configuration sets up the infrastructure for a Task Management application on AWS, including networking, security, and container service resources.

## Resources Created

- **AWS VPC**: A virtual private cloud to host the application resources.
- **AWS Subnet**: A subnet within the VPC for the application components.
- **AWS Security Group**: Security group for controlling access to the application.
- **AWS ECS Cluster**: The Amazon Elastic Container Service cluster to run the application's containers.
- **AWS ECS Task Definition**: The task definition for running the application's container.

## Variables

- `aws_region`: The AWS region where resources will be created.
- `vpc_cidr`: CIDR block for the VPC.
- `subnet_cidr`: CIDR block for the subnet.
- `availability_zone`: Availability zone for the subnet.
- `allowed_cidr`: CIDR blocks allowed to access the application.
- `container_image`: Docker image for the task management app.

## Security

The security group is configured to allow inbound traffic on port 80 (HTTP) from specified CIDR blocks, ensuring that the application can be accessed over the web while restricting unauthorized access.