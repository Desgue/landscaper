.PHONY: build run dev clean

build:
	@mkdir -p frontend/dist
	@test -f frontend/dist/index.html || echo "placeholder" > frontend/dist/index.html
	go build -o server/server ./cmd/server/

run:
	./server/server

dev: build run

clean:
	rm -rf server/
