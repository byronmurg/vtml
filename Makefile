
TS_FILES=$(shell find src -name *.ts)
JS_FILES_BASE=$(patsubst %.ts, %.js,$(TS_FILES))
JS_FILES=$(addprefix build/,$(JS_FILES_BASE))

PREFIX=/usr/local

RELEASE_NAMES=linux-arm64.tar.gz darwin-arm64.tar.gz darwin-x86_64.tar.gz win-x86_64.zip linux-x86_64.tar.gz
RELEASES=$(addprefix release/vtml-,$(RELEASE_NAMES))

vtml: release/vtml-linux-x86_64/vtml
	cp $< $@

install: vtml
	install $< -o root -g root -m 755 $(PREFIX)/bin/vtml

release: $(RELEASES) #release/vtml-linux-x86_64.tar.gz release/vtml-darwin-x86_64.tar.gz release/vtml-win-x86_64.zip
	@echo Done!

test:
	node_modules/.bin/jest --coverage

release/vtml-linux-x86_64/vtml: $(JS_FILES) package.json
	./release.sh linux x86

release/vtml-linux-arm64/vtml: $(JS_FILES) package.json
	./release.sh linux arm64

release/vtml-darwin-x86_64/vtml: $(JS_FILES) package.json
	./release.sh darwin x86

release/vtml-darwin-arm64/vtml: $(JS_FILES) package.json
	./release.sh darwin arm64

release/vtml-win-x86_64/vtml.exe: $(JS_FILES) package.json
	./release.sh win x86

release/vtml-%.tar.gz: release/vtml-%/vtml release/vtml-%/README.md release/vtml-%/LICENSE
	tar c release/vtml-$* | gzip > $@

# Window has it's own secial rule
release/vtml-win-x86_64.zip: release/vtml-win-x86_64/vtml.exe release/vtml-win-x86_64/README.md release/vtml-win-x86_64/LICENSE
	zip $@ release/vtml-win-x86_64/*

release/vtml-%/LICENSE: LICENSE
	cp $< $@

release/vtml-%/README.md: README.md
	cp $< $@

$(JS_FILES): $(TS_FILES)
	npm install --save-dev
	tsc

clean:
	rm -rf build release coverage vtml
	
.PHONY: clean test release vtml install
