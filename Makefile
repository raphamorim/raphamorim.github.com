# gem installs jekyll under the user gem dir, which is not on PATH.
JEKYLL := $(shell command -v jekyll 2>/dev/null || echo $(HOME)/.gem/ruby/$(shell ruby -e 'print RUBY_VERSION.sub(/\d+$$/, "0")')/bin/jekyll)
SERVE := serve --watch --incremental

run:
	$(JEKYLL) $(SERVE)

dev:
	$(JEKYLL) $(SERVE)
