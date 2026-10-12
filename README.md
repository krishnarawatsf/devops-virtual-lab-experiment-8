# VLE-8: Blue-Green Deployment using DevOps Tools

[![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD-blue?logo=jenkins)](Jenkinsfile)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Blue%2FGreen-326ce5?logo=kubernetes&logoColor=white)](k8s/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Terraform](https://img.shields.io/badge/Terraform-AWS-7B42BC?logo=terraform&logoColor=white)](terraform/)
[![Ansible](https://img.shields.io/badge/Ansible-Jenkins%20setup-EE0000?logo=ansible&logoColor=white)](ansible/)
[![Prometheus](https://img.shields.io/badge/Prometheus-scraping-e6522c?logo=prometheus&logoColor=white)](monitoring/prometheus/)
[![Grafana](https://img.shields.io/badge/Grafana-dashboards-f46800?logo=grafana&logoColor=white)](monitoring/grafana/)

Blue (v1) is the live environment. Green (v2) is deployed in parallel. Traffic moves only when the Kubernetes Service selector (or the local service switch) is patched from `color: blue` to `color: green`. Rollback is the same patch in reverse. There is no downtime because both replica sets stay running.

```text
Developer → GitHub push → Jenkins (build image, deploy Green)
                → Kubernetes Cluster
                     Blue pods x2  (live)
                     Green pods x2 (idle until switch)
                     Service switch / traffic routing
                → Prometheus → Alertmanager → Grafana → Users
```

## Repository layout

```text
├── Jenkinsfile                 # Build → Deploy Green → Switch Traffic
├── docker-compose.yml          # Local full stack (Blue, Green, switch, Prom, Grafana)
├── Dockerfile                  # Node myapp image used as myapp:v1 / myapp:v2
├── server.js                   # Command center UI API
├── ansible/                    # Jenkins + Docker host configuration
├── app/                        # Static nginx v1/v2 pages (lab Dockerfile)
├── docs/                       # Assignment brief + experiment report
├── k8s/                        # Blue deploy, Green deploy, Service
├── monitoring/                 # Prometheus, Grafana, Alertmanager
├── public/                     # Command center UI
├── scripts/                    # Switch, rollback, verify, kubectl apply
├── src/                        # myapp + service switcher
├── terraform/                  # AWS Jenkins EC2 in ap-south-1
└── tests/                      # Manifest and pipeline checks
```

## Run the local stack

Requires Docker Desktop.

```bash
npm test
docker compose up --build -d
bash scripts/verify_stack.sh
```

Open:

| Component | URL |
| --- | --- |
| Command center | http://localhost:8080 |
| Live app (Service switch) | http://localhost:8090 |
| Prometheus | http://localhost:9090 |
| Grafana (admin / admin) | http://localhost:3000 |
| Alertmanager | http://localhost:9093 |

Switch traffic:

```bash
bash scripts/switch_to_green.sh   # Blue → Green
bash scripts/rollback_to_blue.sh  # Green → Blue
```

Or use the two buttons on the command center.

## Kubernetes procedure (Minikube / EKS)

```bash
docker build -t myapp:v1 --build-arg unused=1 .
docker build -t myapp:v2 .
bash scripts/deploy_k8s.sh
kubectl patch service myapp-service -p '{"spec":{"selector":{"app":"myapp","color":"green"}}}'
```

## AWS Jenkins host

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# set allowed_cidr to your public IP
terraform init
terraform apply
cd ../ansible
# put the public IP into inventory.ini
ansible-playbook -i inventory.ini jenkins_setup.yml
```

Do not apply Terraform unless you intend to create billable AWS resources.
