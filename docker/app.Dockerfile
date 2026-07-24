FROM golang:1.22-alpine AS builder

WORKDIR /src/backend

COPY backend/ .

RUN GO111MODULE=off CGO_ENABLED=0 go build -o /out/mylocalveeam-api .

FROM alpine:3.20

RUN apk add --no-cache bash postgresql-client openssl curl python3 ca-certificates coreutils \
	&& update-ca-certificates \
	&& cd /usr/local/bin \
	&& curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o mc \
	# Dynamic checksum verification using MinIO's official signature
	&& curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc.sha256sum -o mc.sha256sum \
	&& awk 'NR==1 {print $1 "  mc"}' mc.sha256sum | sha256sum -c - \
	&& rm mc.sha256sum \
	&& chmod +x mc

WORKDIR /app

COPY --from=builder /out/mylocalveeam-api /app/mylocalveeam-api
COPY scripts/ /app/scripts/

RUN addgroup -S veeamgroup && adduser -S veeamuser -G veeamgroup \
	&& chown -R veeamuser:veeamgroup /app \
	&& find /app/scripts -type f -name '*.sh' -exec chmod +x {} +

USER veeamuser

EXPOSE 8080

CMD ["./mylocalveeam-api"]