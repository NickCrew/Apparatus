SHELL := /bin/sh

install:
	npm ci

dev:
	npx ts-node src/index.ts

build:
	npm run build

certs:
	mkdir -p certs && openssl req -x509 -newkey rsa:2048 -keyout certs/server.key -out certs/server.crt -days 365 -nodes -subj "/CN=localhost"

up: build
	docker compose up --build

down:
	docker compose down

k8s-apply:
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/deployment.yaml
	kubectl apply -f k8s/service.yaml
	kubectl apply -f k8s/ingress.yaml
	kubectl apply -f k8s/escape-cronjob.yaml
	kubectl apply -f k8s/imposter.yaml
	kubectl apply -f k8s/sidecar.yaml

k8s-delete:
	kubectl delete -f k8s/sidecar.yaml --ignore-not-found
	kubectl delete -f k8s/imposter.yaml --ignore-not-found
	kubectl delete -f k8s/escape-cronjob.yaml --ignore-not-found
	kubectl delete -f k8s/ingress.yaml --ignore-not-found
	kubectl delete -f k8s/service.yaml --ignore-not-found
	kubectl delete -f k8s/deployment.yaml --ignore-not-found
	kubectl delete -f k8s/configmap.yaml --ignore-not-found
	kubectl delete -f k8s/namespace.yaml --ignore-not-found

k8s-wait:
	kubectl -n echo rollout status deploy/ts-apparatus

k6-baseline:
	k6 run k6/scenarios/baseline.js

k6-headers:
	k6 run k6/scenarios/headers-matrix.js

k6-large:
	k6 run k6/scenarios/large-body.js

k6-binary:
	k6 run k6/scenarios/binary-upload.js

k6-h2:
	k6 run k6/scenarios/h2-ingress.js

k6-stress:
	k6 run k6/scenarios/stress-stages.js

k6-waf:
	k6 run k6/scenarios/waf-poke.js
