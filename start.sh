echo "Starting DRGON... this should only take a moment."
sh .env

export ENV_LOADED_STATUS=$(echo $?)
if [[ $ENV_LOADED_STATUS -ne 0 ]]; then
    echo "Error: Could not load .env file."
    exit 1
fi

command -v docker | export DOCKER_INSTALLED=$?
command -v docker-compose | export DOCKER_COMPOSE_INSTALLED=$?


if [[ $DOCKER_INSTALLED -ne 0 ]]; then
	echo "Error: Docker is not installed on this machine."
	exit 1
fi

if [[ $DOCKER_COMPOSE_INSTALLED -ne 0 ]]; then
	echo "Error: Docker Compose is not installed on this machine."
	exit 1
fi

docker compose up -d

export START_STATUS=$(echo $?)
if [[ $START_STATUS -ne 0 ]]; then
    echo "Error: DRGON did not start successfully."
    exit 1
fi

echo "Done! You can stop your DRGON instance at any time with 'docker compose down'."
exit 0

