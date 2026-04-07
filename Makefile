.PHONY: build build-frontend build-backend run dev clean

build: build-frontend build-backend

build-frontend:
	npm run build
	@rm -rf frontend/dist
	@mv dist frontend/dist

build-backend:
	go build -o server/server ./cmd/server/

run:
	./server/server

dev: build run

clean:
	rm -rf server/ frontend/dist/
