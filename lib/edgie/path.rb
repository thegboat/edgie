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

    def closed?
      last == first
    end

    def add_point(*args)
      coord = Edgie::Coordinate.new_or_self(args) 
      return false if last == coord
      if last
        last.next_point = coord
        coord.prev_point = last
      end
      points << coord
      adjust_rect(coord)
      true
    end
    alias :<< :add_point

    def ==(val)
      val.is_a?(self.class) && points == val.points
    end
    alias :eql? :==

    def close_path!
      unless closed?
        last.next_point = first
        first.prev_point = last
        points.push(first)
      end
    end


  end
end