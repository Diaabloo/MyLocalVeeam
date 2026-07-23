FROM golang:1.22-alpine AS builder

WORKDIR /src/backend

COPY backend/ .

RUN GO111MODULE=off CGO_ENABLED=0 go build -o /out/mylocalveeam-api .

FROM alpine:3.20

RUN apk add --no-cache bash postgresql-client openssl curl python3 ca-certificates coreutils \
	&& update-ca-certificates \
	&& curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc \
	# Vérification du checksum pour sécuriser la supply chain
	&& echo "b1d724a8e2b47e5178272a583f21a4c95f0c18a49c29d49f74a0134b3e94a8a5  /usr/local/bin/mc" | sha256sum -c - \
	&& chmod +x /usr/local/bin/mc

WORKDIR /app

COPY --from=builder /out/mylocalveeam-api /app/mylocalveeam-api
COPY scripts/ /app/scripts/

RUN addgroup -S veeamgroup && adduser -S veeamuser -G veeamgroup \
	&& chown -R veeamuser:veeamgroup /app \
	&& find /app/scripts -type f -name '*.sh' -exec chmod +x {} +

USER veeamuser

EXPOSE 8080

CMD ["./mylocalveeam-api"]