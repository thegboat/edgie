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

    def splice(head,tail)
      was = closed?

      if head.prev_point
        idx = index(head)
        necks = head.next_point
        necks.prev_point = head.next_point = tail
        tail.prev_point = head
        tail.next_point = necks
      else
        idx = index(tail)
        prev = tail.prev_point
        prev.next_point = tail.prev_point = head
        head.prev_point = prev
        head.next_point = tail
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