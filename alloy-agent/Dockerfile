# Use official Alloy image
FROM grafana/alloy:latest

# Copy configuration file
COPY alloy-config.yaml /etc/alloy/alloy-config.yaml

# Set the default command
CMD ["--config.file=/etc/alloy/alloy-config.yaml"]
