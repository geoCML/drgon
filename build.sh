echo "Building DRGON... this should only take a few minutes."
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

docker compose build --build-arg DRGON_POSTGRES_ADMIN_PASSWORD

export BUILD_STATUS=$(echo $?)
if [[ $BUILD_STATUS -ne 0 ]]; then
    echo "Error: DRGON did not build successfully."
    exit 1
fi

echo "Done! You can start your DRGON instance by running the 'start.sh' script."
exit 0

