# 2. docker-compose for local dev/self-host, not Kubernetes

## Status

Accepted

## Context

Snapshare ships two ways: as a Vercel deployment (the actual production
target) and as a standalone Docker image anyone can run themselves. Both
need Redis, and the app needs to reach it the same way in every environment.

`@upstash/redis` speaks Upstash's REST API, not the native Redis wire
protocol — that's true in production (a real Upstash database) and needs to
stay true locally too, for dev/prod parity. A plain `redis:alpine` container
alone isn't reachable by that client; something has to sit in front of it
translating REST to the native protocol. That's what pulled in a second
container (`serverless-redis-http`) beyond just "run redis", and made some
form of multi-container orchestration necessary even for local development,
not just for a hypothetical self-hosted deployment.

The question this ADR answers: given that a self-hosted deployment needs
more than one container (app, redis, the REST shim, and optionally an
observability stack), is a Kubernetes manifest/Helm chart the right way to
express that, or is docker-compose enough?

## Decision

Use `docker-compose.yml` with profiles: the default profile runs `app`,
`redis`, and `srh` (the REST shim); an opt-in `observability` profile adds
an OTel Collector, Prometheus, and Grafana for anyone who wants to see the
telemetry the app already emits. No Kubernetes manifests exist in this repo.

## Consequences

- `docker compose up` is the entire onboarding step for local dev parity and
  for anyone who wants to self-host instead of using the Vercel deployment.
  There's no cluster to stand up, no Helm chart to template, no ingress
  controller to configure first.
- Production itself is Vercel's serverless platform plus a managed Upstash
  database — there is no cluster in production to mirror. Compose's job here
  is strictly local dev parity and an optional self-host path, not modeling
  a production topology that doesn't exist. Building Kubernetes manifests
  would be infrastructure for an environment this project doesn't run in.
- Profiles keep the heavier, purely-optional observability stack (Collector
  + Prometheus + Grafana) out of the default path — someone who just wants
  the app running locally never pays for containers they didn't ask for.
- The real cost of this decision: it doesn't exercise anything a genuine
  multi-replica deployment would need to handle — rolling updates, autoscaling,
  a service mesh, pod-level health/readiness semantics distinct from a single
  container's healthcheck. That's an accepted gap, not an oversight — those
  concerns only matter for a topology this project doesn't have.
