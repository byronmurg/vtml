
TS_FILES=$(shell find src -name *.ts)
JS_FILES_BASE=$(patsubst %.ts, %.js,$(TS_FILES))
JS_FILES=$(addprefix build/,$(JS_FILES_BASE))

PREFIX=/usr/local

PKG=npx @yao-pkg/pkg
PKG_OPTS=--compress GZip

vtml: release/vtml-linux-x86_64/vtml
	cp $< $@

install: vtml
	install $< -o root -g root -m 755 $(PREFIX)/bin/vtml

release: release/vtml-linux-x86_64.tar.gz # release/vtml-macos-x86_64.tar.gz
	@echo Done!

test:
	node_modules/.bin/jest --coverage

release/vtml-%/vtml: $(JS_FILES) package.json
	$(PKG) -t node22-$* -o $@ package.json $(PKG_OPTS)

release/vtml-%.tar.gz: release/vtml-%/vtml release/vtml-%/README.md release/vtml-%/LICENSE
	tar c release/vtml-$* | gzip > $@

release/vtml-%/LICENSE: LICENSE
	cp $< $@

release/vtml-%/README.md: README.md
	cp $< $@

$(JS_FILES): $(TS_FILES)
	npm install --save-dev
	tsc

clean:
	rm -rf build release coverage
	
.PHONY: clean test release vtml install
