$env:SWEETBOOK_ENABLED="true"
$env:SWEETBOOK_API_KEY="SB1DRISY6T4S.HBvbfF3uQg4jXxLe39PkkXqlM3sTDVsb"
$env:SWEETBOOK_BASE_URL="https://api-sandbox.sweetbook.com/v1"

$env:GOOGLE_CLIENT_ID="..."
$env:GOOGLE_CLIENT_SECRET="..."
$env:GOOGLE_REDIRECT_URI="http://localhost:5173/oauth/google/callback"
$env:YOUTUBE_API_KEY="..."

.\gradlew.bat bootRun --args="--spring.profiles.active=local --server.port=8080"
