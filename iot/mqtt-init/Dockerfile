FROM eclipse-mosquitto:2

USER root
COPY init-auth.sh /usr/local/bin/init-auth
RUN chmod +x /usr/local/bin/init-auth

ENTRYPOINT ["/usr/local/bin/init-auth"]

