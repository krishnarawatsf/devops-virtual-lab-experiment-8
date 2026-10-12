#!/bin/bash
set -euxo pipefail
apt-get update -y
apt-get install -y docker.io python3 python3-pip git
systemctl enable --now docker
usermod -aG docker ubuntu
# Jenkins and kubectl are installed by Ansible (ansible/jenkins_setup.yml)
