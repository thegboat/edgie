require 'active_support/all'
require 'erubis'

require "edgie/version"
require "edgie/generator"

module Edgie
  def self.create(svg_file, file_name)
    generator = Edgie::Generator.new(svg_file, file_name)
    generator.run
  end
end
