# -*- encoding: utf-8 -*-
require File.expand_path('../lib/edgie/version', __FILE__)

Gem::Specification.new do |gem|
  gem.authors       = ["Grady Griffin"]
  gem.email         = ["gradygriffin@gmail.com"]
  gem.description   = %q{Builds interactive javascript maps from svg files}
  gem.summary       = %q{Builds interactive javascript maps from svg files}
  gem.homepage      = ""

  gem.files         = `git ls-files`.split($\)
  gem.executables   = gem.files.grep(%r{^bin/}).map{ |f| File.basename(f) }
  gem.test_files    = gem.files.grep(%r{^(test|spec|features)/})
  gem.name          = "edgie"
  gem.require_paths = ["lib"]
  gem.version       = Edgie::VERSION::STRING

  gem.add_runtime_dependency "activesupport", '>=3.0.0'
  gem.add_runtime_dependency "erubis", ">=2.6.0"
  gem.add_development_dependency("rspec")
  gem.add_development_dependency("ruby-debug19")
end
