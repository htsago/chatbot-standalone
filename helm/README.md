# Helm Chart for Chatbot Standalone

This Helm chart deploys the Chatbot application with Backend and Frontend as subcharts in Kubernetes/Minikube.

## Quick Start

1. Install prerequisites (kubectl, minikube, helm)
2. Build images: `./build-images.sh`
3. Configure API keys in `values.yaml`
4. Deploy: `./deploy-minikube.sh`
5. Access via port-forward (see below)

For detailed instructions, see [START.md](START.md)

## Prerequisites

- Kubernetes cluster (Minikube)
- Helm 3.x
- Docker (for image builds)
- kubectl

## Installation

### Install Tools

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

### Setup Minikube

```bash
minikube start
eval $(minikube docker-env)
```

## Build Images

Images must be built locally as they are not in a registry:

```bash
cd helm
./build-images.sh
```

Or manually:
```bash
cd porto-backend && docker build -t chatbot-backend:latest .
cd ../porto-frontend && docker build -t chatbot-frontend:latest .
```

## Configuration

### Set API Keys

Edit `values.yaml`:

```yaml
backend:
  env:
    GROQ_API_KEY: "your_key"
    OPENAI_API_KEY: "your_key"
    TAVILY_API_KEY: "your_key"
```

## Deployment

```bash
cd helm
./deploy-minikube.sh
```

## Access

### Port-Forward (Recommended)

```bash
# Terminal 1 - Backend
kubectl port-forward svc/chatbot-standalone-backend 8090:8090

# Terminal 2 - Frontend
kubectl port-forward svc/chatbot-standalone-frontend 5173:5173
```

Then open:
- Frontend: http://localhost:5173
- Backend: http://localhost:8090

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/chatbot-standalone-backend

# Frontend logs
kubectl logs -f deployment/chatbot-standalone-frontend

# All logs
kubectl logs -f -l app.kubernetes.io/instance=chatbot-standalone
```

## Upgrade & Uninstall

```bash
# Upgrade
helm upgrade chatbot-standalone . -f values.yaml

# Uninstall
helm uninstall chatbot-standalone
```

## Chart Structure

```
helm/
├── Chart.yaml              # Main chart definition
├── values.yaml             # Configuration values
├── templates/              # Main chart templates
│   └── ingress.yaml
└── charts/                 # Subcharts
    ├── backend/            # Backend subchart
    └── frontend/           # Frontend subchart
```
