# Alloy Agent for Grafana Cloud Metrics

This folder contains the configuration and Dockerfile to deploy Grafana Alloy as a Render.com Background Worker to forward Prometheus metrics from your backend to Grafana Cloud.

## Files
- `alloy-config.yaml`: Alloy configuration (edit targets as needed)
- `Dockerfile`: Container definition for Alloy

## Usage
1. Deploy this folder as a Background Worker on Render.com.
2. Set the start command to:
   
   alloy --config.file=alloy-config.yaml

3. Ensure your backend is accessible at the URL in the config.

## References
- https://grafana.com/docs/alloy/latest/
- https://render.com/docs/background-workers
