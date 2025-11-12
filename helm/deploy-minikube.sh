#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RELEASE_NAME="agent"
NAMESPACE="default"

# Check dependencies
for cmd in kubectl minikube helm; do
    command -v $cmd &>/dev/null || { echo "ERROR: $cmd not installed!"; exit 1; }
done

# Start minikube if not running
if ! minikube status &>/dev/null; then
    echo "Starting minikube..."
    minikube delete 2>/dev/null || true
    minikube start
    sleep 5
fi

eval $(minikube docker-env)

# Check values.yaml exists
[ -f "values.yaml" ] || { echo "ERROR: values.yaml not found!"; exit 1; }

# Deploy with helm
helm dependency update
if helm list -n $NAMESPACE 2>/dev/null | grep -q $RELEASE_NAME; then
    helm upgrade $RELEASE_NAME . -f values.yaml
else
    helm install $RELEASE_NAME . -f values.yaml
fi

# Wait for pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=$RELEASE_NAME --timeout=300s

echo -e "\nServices:"
kubectl get svc -l app.kubernetes.io/instance=$RELEASE_NAME
echo -e "\nPods:"
kubectl get pods -l app.kubernetes.io/instance=$RELEASE_NAME

# Setup port-forwarding
setup_forward() {
    local port=$1 svc=$2
    if command -v lsof &>/dev/null && lsof -Pi :$port -sTCP:LISTEN -t &>/dev/null; then
        echo "WARNING: Port $port already in use"
        return
    fi
    kubectl port-forward svc/${RELEASE_NAME}-$svc $port:$port &>/dev/null &
    echo $! > ${svc}-port-forward.pid
}

setup_forward 8090 backend
setup_forward 5173 frontend

sleep 2
echo -e "\nPort-forwards active:"
echo "  Backend:  http://localhost:8090"
echo "  Frontend: http://localhost:5173"
echo -e "\nTo stop: kill \$(cat *-port-forward.pid)"