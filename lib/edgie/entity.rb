module Edgie
  class Entity

    include Edgie::Rectangulate

    attr_reader :title, :edges, :paths

    def initialize(entity_title)
      @title = entity_title
      @neighbors = []
      @paths = []
    end

    def name
      title.downcase
    end

    def add_path(val)
      @paths << val
    end

    def edges
      paths.map {|path_id| "#{path_id}z"}
    end


  end
end