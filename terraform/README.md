# ☁️ Azure Infrastructure Deployment

This directory contains the Infrastructure-as-Code (IaC) required to deploy the **MyLocalVeeam** stack on Microsoft Azure using a hybrid architecture of Virtual Machines and Kubernetes.

## 📐 Architecture Overview

1. **Azure Kubernetes Service (AKS)**: Hosts the stateless Go Backend API (`mylocalveeam-api`) for high availability and scalability.
2. **Azure Virtual Machine (IaaS)**: Hosts the stateful infrastructure components (PostgreSQL, MinIO, HashiCorp Vault).
3. **Virtual Network (VNet)**: Secures communication between the AKS cluster and the Infrastructure VM.

## 🚀 Deployment Guide

### Prerequisites
- Azure CLI (`az login` completed)
- Terraform (v1.0+)
- Ansible
- kubectl

---

### Step 1: Provision Infrastructure (Terraform)
Initialize and apply the Terraform configuration to create the Resource Group, VNet, AKS Cluster, and Ubuntu VM.

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```
*Note: Make sure your public SSH key exists at `~/.ssh/id_rsa.pub` as it will be injected into the VM for Ansible access.*

---

### Step 2: Configure the VM (Ansible)
Once Terraform completes, note the IP address of the newly created VM (`nic-infra-vm`).

1. Update the IP address in `inventory.ini`:
   ```ini
   vm-infra-services ansible_host=<YOUR_VM_PUBLIC_OR_PRIVATE_IP> ansible_user=azureuser ...
   ```
2. Run the Ansible playbook to install Docker and start the infrastructure services:
   ```bash
   ansible-playbook -i inventory.ini setup-infra.yml
   ```

---

### Step 3: Deploy API to AKS (Kubernetes)
Connect your local `kubectl` to the newly provisioned AKS cluster and deploy the application manifests.

```bash
# Get AKS credentials
az aks get-credentials --resource-group rg-mylocalveeam-prod --name aks-mylocalveeam-prod

# Apply Kubernetes manifests
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-deployment.yaml
kubectl apply -f 03-service.yaml
```