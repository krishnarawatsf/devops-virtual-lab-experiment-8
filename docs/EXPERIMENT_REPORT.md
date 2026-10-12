# Virtual Lab Experiment 8 — Blue-Green Deployment

## Objective

Implement a Blue-Green deployment using Jenkins, Kubernetes, Docker, GitHub, Terraform, and Ansible, with Prometheus and Grafana observing both environments.

## Environments

| Environment | Version | Role | Replicas |
| --- | --- | --- | --- |
| Blue | myapp:v1 | Live production | 2 |
| Green | myapp:v2 | New version, idle until cutover | 2 |

Traffic is not shifted by restarting pods. It is shifted by changing the Service selector `color` from `blue` to `green`.

## Tools

- Terraform: Ubuntu t2.medium Jenkins instance in `ap-south-1`
- Ansible: Docker, Java, Jenkins, kubectl on that host
- Docker: application images v1 and v2
- Jenkins: declarative pipeline in `Jenkinsfile`
- Kubernetes: `deployment-blue.yaml`, `deployment-green.yaml`, `service.yaml`
- Prometheus / Grafana / Alertmanager: scrape and visualize both colors

## Expected result

- Both environments run at the same time
- Users keep hitting Blue until the switch
- Cutover is instantaneous at the Service
- Rollback is a one-line selector patch back to Blue
