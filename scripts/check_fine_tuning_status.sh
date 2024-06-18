#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
  echo "No Job ID provided."
  echo "Usage: $0 <Job ID>"
  exit 1
fi

# Print the provided argument
python -m check_fine_tuning_status $1