# MyLocalVeeam 🛡️

**MyLocalVeeam** is a robust, security-first backup orchestration tool tailored for PostgreSQL databases. Designed to emulate the reliability of enterprise solutions like Veeam, it provides an API-driven orchestrator, a sleek Next.js dashboard, and a fortified infrastructure stack including S3-compatible object storage and centralized Key Management.

## 🏗️ Architecture & Stack

The project architecture relies on modern, secure-by-default tools:

- **Frontend (Next.js & React)**: A modern web interface to trigger backups, execute test restores, and review operation logs in real-time.
- **Backend (Golang)**: A lightweight, fast REST API executing bash scripts for orchestrating the backup and restoration lifecycles.
- **Database (PostgreSQL)**: The target database to be dumped and restored securely.
- **Object Storage (MinIO)**: Serves as an S3-compatible, immutable storage bucket for securely hosting encrypted backup artifacts.
- **Key Management (HashiCorp Vault)**: Acts as the KMS (Key Management Service) to store and provide the AES-256 passphrase used to encrypt and decrypt database dumps.

## ☁️ Cloud Infrastructure (Azure)

The project includes Production-ready Infrastructure-as-Code (IaC) for Microsoft Azure, located in the `terraform/` directory:
- **Terraform**: Provisions the Azure Virtual Network, Azure Kubernetes Service (AKS) for the API, and an Ubuntu Virtual Machine for infrastructure services.
- **Ansible**: Configures the infrastructure VM (Docker, Vault, MinIO, PostgreSQL) seamlessly post-provisioning.
- **Kubernetes**: Manifests to deploy the stateless `mylocalveeam-api` dynamically onto the AKS cluster.

## ⚙️ How it Works

### 1. Backup Workflow (`backup.sh`)
1. The Go backend API receives a request to initiate a backup.
2. `pg_dump` creates a highly compressed local artifact of the target database.
3. The script authenticates with **HashiCorp Vault** to retrieve a highly secure AES-256 encryption passphrase.
4. The database dump is encrypted (`.dump.enc`) via OpenSSL using PBKDF2 with high iterations.
5. The MinIO Client (`mc`) uploads the encrypted artifact to the immutable MinIO storage bucket.

### 2. Restore Workflow (`restore.sh`)
1. The API requests a restoration targeting a specific or the most recent dump in MinIO.
2. The encrypted artifact is downloaded securely from MinIO.
3. The script authenticates with Vault to fetch the encryption key.
4. OpenSSL decrypts the payload locally.
5. `pg_restore` loads the dump back into the PostgreSQL instance.

## 🚀 Prerequisites

- **Docker** & **Docker Compose**
- **Go** 1.23+ (If running backend locally)
- **Node.js** 20+ (If running frontend locally)

## 🛠️ Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Diaabloo/MyLocalVeeam.git
   cd MyLocalVeeam
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the `docker/` directory containing your secrets:
   ```env
   POSTGRES_PASSWORD=your_secure_db_password
   MINIO_ROOT_PASSWORD=your_secure_minio_admin_password
   VAULT_BACKUP_PASSPHRASE=your_aes_encryption_key_passphrase
   ```

3. **Start the Infrastructure Stack:**
   ```bash
   cd docker
   docker-compose up -d --build
   ```
   This will spin up:
   - PostgreSQL Database
   - MinIO Storage Server
   - HashiCorp Vault Server
   - MyLocalVeeam Go API

4. **Run the Frontend UI:**
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Access the dashboard at `http://localhost:3000`.

## 🔐 Security Standards (DevSecOps)

The project follows rigorous CI/CD security pipelines using GitHub Actions:
- **Secret Scanning**: Uses Gitleaks/TruffleHog to prevent leaked credentials.
- **Vulnerability Scanning**: Uses Trivy to scan the Go environment, Alpine base images, and dependencies prior to pushing to GitHub Container Registry (GHCR).
- **Dynamic Checksums**: Dynamically verifies the supply-chain signatures of downloaded binaries (`mc` client) during Docker build steps.
- **Vault Key Management**: Passwords are never hardcoded. Encryption keys live exclusively inside Vault memory.
