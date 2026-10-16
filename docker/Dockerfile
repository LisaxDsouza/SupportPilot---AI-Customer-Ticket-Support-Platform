# SupportPilot PostgreSQL Database Container
# Pre-loaded with complete enterprise schemas and seed data

FROM postgres:15-alpine

LABEL maintainer="SupportPilot Engineering Team"
LABEL description="PostgreSQL 15 database container with SupportPilot schemas and seed fixtures"

# PostgreSQL initializes any .sql scripts placed in /docker-entrypoint-initdb.d/
COPY docker/init.sql /docker-entrypoint-initdb.d/01-init.sql

# Expose standard PostgreSQL port
EXPOSE 5432
