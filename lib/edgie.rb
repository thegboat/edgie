require 'active_support/all'
require 'erubis'

require "edgie/version"
require "edgie/edgie"
require "edgie/rectangulate"
require "edgie/entity"
require "edgie/path"
require "edgie/inflated_path"
require "edgie/generator"
require "edgie/coordinate"

module Edgie
  def self.log(data)
    @log ||= File.open('log', 'w+')
    @log.write(data + "\n")
  end
end
