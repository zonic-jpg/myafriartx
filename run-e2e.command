#!/bin/bash
cd /Users/olufemiadeagbo/Downloads/artstage-8
PLAYWRIGHT_NO_SERVER=1 npx playwright test --reporter=list > /Users/olufemiadeagbo/Downloads/artstage-8/test-results-e2e-summary.txt 2>&1
echo EXIT_CODE=$? >> /Users/olufemiadeagbo/Downloads/artstage-8/test-results-e2e-summary.txt
touch /Users/olufemiadeagbo/Downloads/artstage-8/.e2e-done
