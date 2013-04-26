module Edgie
  class Path

    include Edgie::Rectangulate

    attr_reader :points, :path_id
    attr_accessor :edges

    delegate :empty?, :present?, :length, :index, :first, :last, :reverse!, :inspect, :select, :to => :points

    def initialize(path_id = nil)
      @path_id = path_id
      @points = []
      @edges = []
    end

    def closed?
      last == first
    end

    def add_point(*args)
      coord = Edgie::Coordinate.new_or_self(args) 
      return false if last == coord
      if last
        last.set_next_point_for(path_id, coord)
        coord.set_prev_point_for(path_id, last)
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
        last.set_next_point_for(path_id, first)
        first.set_prev_point_for(path_id, last)
        points.push(first)
      end
    end

    def splice(head,tail)
      was = closed?

      if head.prev_point_for(path_id)
        idx = index(head)
        necks = head.next_point_for(path_id)
        necks.set_prev_point_for(path_id, tail)
        head.set_next_point_for(path_id, tail)
        tail.set_prev_point_for(path_id, head)
        tail.set_next_point_for(path_id, necks)
      else
        idx = index(tail)
        prev = tail.prev_point_for(path_id)
        prev.set_next_point_for(path_id, head)
        tail.set_prev_point_for(path_id, head)
        head.set_prev_point_for(path_id, prev)
        head.set_next_point_for(path_id,tail)
      end

      @points[idx..idx] = [head,tail]
      @points.uniq!
      close_path! if was
    end
    
    def crop_region(path)
      path.rect.crop_region(self)
    end

    def build_edge(path)
      my_pts = crop_region(path)
      ot_pts = path.crop_region(self)

      return if my_pts.empty? or ot_pts.empty?

      rect0, rect1 = Rectangle.new(my_pts), Rectangle.new(ot_pts)
      rect2 = nil

      until rect2 == rect0
        rect2 = Rectangle.new(my_pts)
        if rect0 > rect1
          my_pts = rect0.crop_region(path)
        else
          ot_pts = rect1.crop_region(self)
        end
        rect0, rect1 = Rectangle.new(my_pts), Rectangle.new(ot_pts)
      end

      Edgie::Edge.new(my_pts)

    end


  end
end