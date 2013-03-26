module Edgie
  class Path

    include Edgie::Rectangulate

    attr_reader :points, :path_id

    delegate :empty?, :present?, :length, :index, :first, :last, :reverse!, :inspect, :select, :to => :points

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

    def intercept(contained_coord, coord)

      slope = coord.slope(contained_coord)

      point1 = if slope
        y_intercept = coord.y_point - (coord.x_point*slope)
        if coord.west_of?(sw_point)
          Edgie::Coordinate.new(sw_point.x_point - 0.1, y_intercept + (sw_point.x_point * slope))
        elsif coord.east_of?(ne_point)
          Edgie::Coordinate.new(ne_point.x_point + 0.1, y_intercept + (ne_point.x_point * slope))
        else
          coord
        end
      end

      point2 = if slope != 0
        if slope
          y_intercept = coord.y_point - (coord.x_point*slope)
          if coord.south_of?(sw_point)
            Edgie::Coordinate.new((sw_point.y_point - y_intercept)/slope, sw_point.y_point - 0.1)
          elsif coord.north_of?(ne_point)
            Edgie::Coordinate.new((ne_point.y_point - y_intercept)/slope, ne_point.y_point + 0.1)
          else
            coord
          end
        else
          if coord.south_of?(sw_point)
            Edgie::Coordinate.new(coord.x_point, sw_point.y_point - 0.1)
          elsif coord.north_of?(ne_point)
            Edgie::Coordinate.new(coord.x_point, ne_point.y_point + 0.1)
          else
            coord
          end
        end
      end

      [point1,point2].compact.uniq.sort_by {|point| point - coord}.first
    end

    def splice(head,tail)
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
      point[idx..idx] = [head,tail]
      
      was = closed?
      @points.uniq!
      @points.push(@points.first) if was
    end
    
    def contained_chain(path)
      rtn = []
      pts = select {|pt| path.contains?(pt)}
      cur = head = pts.detect {|pt| !path.contains?(pt.prev_point)}
      while path.contains?(cur)
        rtn << cur
        cur = cur.next_point
      end
      tail = rtn.last

      new_head = intercept(head, head.prev_point)
      splice(new_head, head) if new_head - head > 0.1
      new_tail = intercept(tail, tail.next_point)
      splice(tail, new_tail) if new_tail - tail > 0.1


    end

    def build_edge(path)
      my_pts = contained_chain(path)
      ot_pts = path.contained_chain(self)
    end


  end
end