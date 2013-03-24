module Edgie
  class Path

    include Edgie::Rectangulate

    attr_reader :points, :path_id

    delegate :empty?, :present?, :length, :index, :first, :last, :reverse!, :inspect, :to => :points

    def initialize(path_id = nil)
      @path_id = path_id
      @points = []
    end

    def adjust_rect(*coords)
      coords = [coords].flatten
      if coords.empty?
        points.each {|point| adjust_rect(point) }
      else
        super
      end
    end

    def add_point(*args)
      coord = Edgie::Coordinate.new_or_self(args) 
      return false if last == coord
      points << coord
      adjust_rect(coord)
      true
    end
    alias :<< :add_point

    def ==(val)
      val.is_a?(self.class) && points == val.points
    end
    alias :eql? :==


  end
end