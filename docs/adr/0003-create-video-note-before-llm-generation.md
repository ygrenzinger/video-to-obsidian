# Create Video Note Before LLM Generation

The import flow creates or reuses the Video note and stores the full Transcript before any LLM call runs. Summary generation and chat are explicit follow-up actions because this makes import deterministic, preserves source material even when providers are unavailable, and prevents hidden AI cost or latency during acquisition.
