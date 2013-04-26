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
      title.underscore_plus
    end

    def add_path(path)
      adjust_rect(path.ne_point, path.sw_point)
      @paths << path.path_id
    end

    def text_placement
      midpoint.move(-3*title.length, 0)
    end

    def edges
      paths.map {|path_id| "#{path_id}z"}
    end


  end
end