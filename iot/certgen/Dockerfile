FROM alpine:3.21

RUN apk add --no-cache openssl

COPY generate-certs.sh /usr/local/bin/generate-certs
RUN chmod +x /usr/local/bin/generate-certs

ENTRYPOINT ["/usr/local/bin/generate-certs"]

