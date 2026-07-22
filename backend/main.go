package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
)

type backupResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Logs    string `json:"logs"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/backup", backupHandler)

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
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
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

func writeJSON(w http.ResponseWriter, statusCode int, payload backupResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("failed to write JSON response: %v", err)
	}
}
