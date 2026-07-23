package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
)

type backupResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Logs    string `json:"logs"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/backups", listBackupsHandler)
	mux.HandleFunc("/api/backup", backupHandler)
	mux.HandleFunc("/api/restore", restoreHandler)

	server := &http.Server{
		Addr:    ":8080",
		Handler: corsMiddleware(mux),
	}

	log.Println("backend API listening on :8080")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Sécurisation CORS (restriction à l'origine du frontend Next.js)
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

type backupItem struct {
	ID        string `json:"id"`
	Database  string `json:"database"`
	Size      string `json:"size"`
	Timestamp string `json:"timestamp"`
	Status    string `json:"status"`
	Location  string `json:"location"`
}

type listBackupsResponse struct {
	Backups []backupItem `json:"backups"`
}

type mcObject struct {
	Key          string `json:"key"`
	Size         int64  `json:"size"`
	LastModified string `json:"lastModified"`
	Type         string `json:"type"`
}

func listBackupsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"status": "Failed", "message": "method not allowed"})
		return
	}

	log.Printf("received list backups request from %s", r.RemoteAddr)

	bucket := os.Getenv("MINIO_BUCKET")
	if bucket == "" {
		bucket = "secure-backups"
	}

	// Construction de l'alias MinIO pour mc
	minioEndpoint := os.Getenv("MINIO_ENDPOINT")
	accessKey := os.Getenv("MINIO_ACCESS_KEY")
	secretKey := os.Getenv("MINIO_SECRET_KEY")

	var mcHost string
	if strings.HasPrefix(minioEndpoint, "https://") {
		mcHost = "https://" + accessKey + ":" + secretKey + "@" + strings.TrimPrefix(minioEndpoint, "https://")
	} else {
		mcHost = "http://" + accessKey + ":" + secretKey + "@" + strings.TrimPrefix(minioEndpoint, "http://")
	}

	// Exécution de la commande d'énumération en JSON
	cmd := exec.Command("mc", "ls", "--json", "--recursive", "minio/"+bucket)
	cmd.Env = append(os.Environ(), "MC_HOST_minio="+mcHost)

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("failed to list backups from minio: %v, output: %s", err, string(output))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"status": "Failed", "message": "failed to list backups"})
		return
	}

	var backups []backupItem
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(bytes.TrimSpace(line)) == 0 {
			continue
		}

		var obj mcObject
		if err := json.Unmarshal(line, &obj); err != nil {
			log.Printf("failed to parse mc json line: %v", err)
			continue
		}

		if obj.Type != "file" {
			continue
		}

		// Le Key MinIO ressemble à: postgres-backups/app_production/app_production-2023.dump.enc
		parts := strings.Split(obj.Key, "/")
		dbName := "unknown"
		if len(parts) >= 2 {
			dbName = parts[len(parts)-2]
		}

		sizeMB := float64(obj.Size) / (1024 * 1024)
		sizeStr := fmt.Sprintf("%.1f MB", sizeMB)

		backups = append(backups, backupItem{
			ID:        parts[len(parts)-1], // On utilise le nom final du fichier comme ID unique
			Database:  dbName,
			Size:      sizeStr,
			Timestamp: obj.LastModified,
			Status:    "Success",
			Location:  "minio/" + bucket + "/" + obj.Key,
		})
	}

	if backups == nil {
		backups = []backupItem{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(listBackupsResponse{Backups: backups})
}

func backupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, backupResponse{
			Status:  "Failed",
			Message: "method not allowed",
		})
		return
	}

	log.Printf("received backup request from %s", r.RemoteAddr)

	cmd := exec.Command("/bin/bash", "/app/scripts/backup.sh")
	output, err := cmd.CombinedOutput()
	logs := string(output)

	if err != nil {
		log.Printf("backup script failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, backupResponse{
			Status:  "Failed",
			Message: fmt.Sprintf("backup failed: %v", err),
			Logs:    logs,
		})
		return
	}

	log.Println("backup script completed successfully")
	writeJSON(w, http.StatusOK, backupResponse{
		Status:  "Success",
		Message: "backup completed successfully",
		Logs:    logs,
	})
}

func restoreHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, backupResponse{
			Status:  "Failed",
			Message: "method not allowed",
		})
		return
	}

	// Structure pour décoder le JSON envoyé par le frontend
	var req struct {
		BackupID string `json:"backupId"`
		Location string `json:"location"`
	}
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	target := req.Location
	if target == "" {
		target = req.BackupID
	}

	log.Printf("received restore request from %s for target: '%s'", r.RemoteAddr, target)

	var cmd *exec.Cmd
	if target != "" {
		cmd = exec.Command("/bin/bash", "/app/scripts/restore.sh", target)
	} else {
		cmd = exec.Command("/bin/bash", "/app/scripts/restore.sh")
	}

	output, err := cmd.CombinedOutput()
	logs := string(output)

	if err != nil {
		log.Printf("restore script failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, backupResponse{
			Status:  "Failed",
			Message: fmt.Sprintf("restore failed: %v", err),
			Logs:    logs,
		})
		return
	}

	log.Println("restore script completed successfully")
	writeJSON(w, http.StatusOK, backupResponse{
		Status:  "Success",
		Message: "restore completed successfully",
		Logs:    logs,
	})
}

func writeJSON(w http.ResponseWriter, statusCode int, payload backupResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("failed to write JSON response: %v", err)
	}
}
