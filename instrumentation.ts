import { registerOTel } from "@vercel/otel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";

export function register() {
  // getNodeAutoInstrumentations() and the metric exporter below use Node's
  // http/net modules directly, unavailable on the edge runtime. Next calls
  // register() for every runtime, so this must stay Node-only.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  registerOTel({
    serviceName: "snapshare",
    // "auto": uses Vercel's native trace integration on Vercel, or standard
    // OTEL_EXPORTER_OTLP_* env vars when self-hosted — no branching needed
    // for either deployment target.
    traceExporter: "auto",
    instrumentations: getNodeAutoInstrumentations({
      // @vercel/otel already instruments fetch itself; leaving this on
      // would double-instrument the same calls (duplicate spans).
      "@opentelemetry/instrumentation-undici": { enabled: false },
    }),
    // No "auto" equivalent for metrics: OTLPMetricExporter still respects
    // the standard OTEL_EXPORTER_OTLP_(METRICS_)ENDPOINT env vars on its
    // own, and fails silently (SDK-internal retry/backoff, not a thrown
    // exception) if nothing is listening — never crashes the app.
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
      }),
    ],
  });
}
