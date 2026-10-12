#!/usr/bin/env bash
set -euo pipefail
echo "Applying Blue, Green, and Service manifests"
kubectl apply -f k8s/deployment-blue.yaml
kubectl apply -f k8s/deployment-green.yaml
kubectl apply -f k8s/service.yaml
kubectl get deploy,svc,pods -l app=myapp
echo
echo "To switch traffic: kubectl patch service myapp-service -p '{\"spec\":{\"selector\":{\"app\":\"myapp\",\"color\":\"green\"}}}'"
echo "To rollback:       kubectl patch service myapp-service -p '{\"spec\":{\"selector\":{\"app\":\"myapp\",\"color\":\"blue\"}}}'"
