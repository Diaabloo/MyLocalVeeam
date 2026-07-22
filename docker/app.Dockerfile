FROM golang:1.21-alpine AS builder

WORKDIR /src/backend

COPY backend/ .

RUN GO111MODULE=off CGO_ENABLED=0 go build -o /out/mylocalveeam-api .

FROM alpine:3.18

RUN apk add --no-cache bash postgresql-client openssl curl python3 ca-certificates \
	&& update-ca-certificates \
	&& curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc \
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