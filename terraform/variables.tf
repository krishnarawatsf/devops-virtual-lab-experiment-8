variable "aws_region" {
  description = "AWS region for the Jenkins control-plane instance"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type for Jenkins"
  type        = string
  default     = "t2.medium"
}

variable "project_name" {
  type    = string
  default = "vle8-blue-green"
}

variable "allowed_cidr" {
  description = "CIDR allowed to reach Jenkins (8080) and SSH"
  type        = string
  default     = "0.0.0.0/0"
}
