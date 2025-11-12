# Getting Started

## Command Reference

### Helm Commands

| Command | Description |
|---------|-------------|
| `helm dependency update` | Updates Helm chart dependencies (backend and frontend subcharts) |
| `helm list -n <namespace>` | Lists all Helm releases in the specified namespace |
| `helm install <release-name> . -f values.yaml` | Installs the Helm chart with the specified release name using values.yaml |
| `helm upgrade <release-name> . -f values.yaml` | Upgrades an existing Helm release with new configuration |

### kubectl Commands

| Command | Description |
|---------|-------------|
| `kubectl get pods` | Lists all pods in the current namespace |
| `kubectl get pods -o wide` | Lists pods with additional details (node, IP addresses) |
| `kubectl get pods -l <label>=<value>` | Lists pods filtered by label selector |
| `kubectl get svc` | Lists all services in the current namespace |
| `kubectl get svc -l <label>=<value>` | Lists services filtered by label selector |
| `kubectl describe pod <pod-name>` | Shows detailed information about a specific pod |
| `kubectl logs -f deployment/<deployment-name>` | Streams logs from all pods in a deployment (follow mode) |
| `kubectl logs -f <pod-name>` | Streams logs from a specific pod (follow mode) |
| `kubectl port-forward svc/<service-name> <local-port>:<service-port>` | Forwards a local port to a service port |
| `kubectl rollout restart deployment/<deployment-name>` | Restarts all pods in a deployment by rolling restart |
| `kubectl wait --for=condition=ready pod -l <label>=<value> --timeout=<seconds>` | Waits for pods matching the label to be ready |
| `kubectl delete pod -l <label>=<value>` | Deletes pods matching the label selector (they will be recreated by the deployment) |

### Minikube Commands

| Command | Description |
|---------|-------------|
| `minikube start` | Starts the Minikube Kubernetes cluster |
| `minikube status` | Shows the status of the Minikube cluster |
| `minikube delete` | Deletes the Minikube cluster |
| `eval $(minikube docker-env)` | Configures Docker to use Minikube's Docker daemon for building images |

## Step 1: Install Prerequisites

```bash
# kubectl
sudo snap install kubectl --classic

# minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
rm minikube-linux-amd64

# helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Step 2: Start Minikube

```bash
minikube start
eval $(minikube docker-env)
```

## Step 3: Build Images

```bash
cd helm
./build-images.sh
```

## Step 4: Configure API Keys

Edit `values.yaml` and set your API keys:

```yaml
backend:
  env:
    GROQ_API_KEY: "your_key"
    OPENAI_API_KEY: "your_key"
    TAVILY_API_KEY: "your_key"
```

You can copy the keys from `porto-backend/.env` if you have them there.

## Step 5: Deploy

```bash
./deploy-minikube.sh
```

## Step 6: Access Application

Port-forwards are started automatically by the deployment script.

Open in browser:
- Frontend: http://localhost:5173
- Backend: http://localhost:8090

To stop port-forwards:
```bash
kill <BACKEND_PID> <FRONTEND_PID>
```
The PIDs are shown after deployment.

To manually start port-forwards:
```bash
kubectl port-forward svc/agent-backend 8090:8090
kubectl port-forward svc/agent-frontend 5173:5173
```

## View Status

```bash
# View all pods
kubectl get pods

# View all services
kubectl get svc

# View pods with details
kubectl get pods -o wide

# View pod status
kubectl describe pod <pod-name>
```

## View Logs

```bash
# Backend logs
kubectl logs -f deployment/agent-backend

# Frontend logs
kubectl logs -f deployment/agent-frontend

# View logs for specific pod
kubectl logs -f <pod-name>
```

## Update Pods

After code changes, update pods:

**Option 1: Rebuild and redeploy (recommended)**
```bash
cd helm
./build-images.sh
./deploy-minikube.sh
```

**Option 2: Restart pods manually**
```bash
# Restart backend
kubectl rollout restart deployment/agent-backend

# Restart frontend
kubectl rollout restart deployment/agent-frontend

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=agent --timeout=300s
```

**Option 3: Delete pods (they will be recreated automatically)**
```bash
# Delete backend pod
kubectl delete pod -l app.kubernetes.io/name=backend

# Delete frontend pod
kubectl delete pod -l app.kubernetes.io/name=frontend
```
