# Architecture

1. Developer pushes code to GitHub.
2. Jenkins builds a Docker image (`myapp:v2`).
3. Jenkins applies the Green Deployment. Blue stays live.
4. After a manual approval gate, Jenkins patches `myapp-service` to `color: green`.
5. Prometheus continues scraping Blue and Green. Grafana shows request rate by color.
6. If Green misbehaves, patch the Service back to `color: blue`.

The Docker Compose stack mirrors this with four app containers and `src/switcher.js` acting as the Kubernetes Service.
