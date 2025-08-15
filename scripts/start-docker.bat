@echo off
echo Starting with Docker...
docker build -t wallwhale-server .
docker run -d -p 3000:3000 --name wallwhale-server wallwhale-server
echo Server started at http://localhost:3000
pause
