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
        y_intercept = coord.y_val - (coord.x_val*slope)
        if coord.west_of?(sw_point)
          Edgie::Coordinate.new(sw_point.x_val + 0.1, y_intercept + (sw_point.x_val + 0.1) * slope)
        elsif coord.east_of?(ne_point)
          Edgie::Coordinate.new(ne_point.x_val - 0.1, y_intercept + (ne_point.x_val - 0.1) * slope)
        else
          contained_coord
        end
      end

      point2 = if slope != 0
        if slope
          y_intercept = coord.y_val - (coord.x_val*slope)
          if coord.south_of?(sw_point)
            Edgie::Coordinate.new((sw_point.y_val - y_intercept - 0.1)/slope, sw_point.y_val - 0.1)
          elsif coord.north_of?(ne_point)
            Edgie::Coordinate.new((ne_point.y_val - y_intercept + 0.1)/slope, ne_point.y_val + 0.1)
          else
            contained_coord
          end
        else
          if coord.south_of?(sw_point)
            Edgie::Coordinate.new(coord.x_val, sw_point.y_val - 0.1)
          elsif coord.north_of?(ne_point)
            Edgie::Coordinate.new(coord.x_val, ne_point.y_val + 0.1)
          else
            contained_coord
          end
        end
      end

      [point1,point2].compact.uniq.sort_by {|point| point - coord}.first
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
    
    def chain_endpoints(path)
      rtn = []
      head = tail = nil
      points.each do |pt|
        if path.contains?(pt)
          head = pt unless head or path.contains?(pt.prev_point)
          tail = pt unless tail or path.contains?(pt.next_point) 
        end
        break if head and tail
      end

      return unless head and tail
      
      new_head = path.intercept(head, head.prev_point)
      splice(new_head, head) if new_head - head > 0.1
      new_tail = path.intercept(tail, tail.next_point)
      splice(tail, new_tail) if new_tail - tail > 0.1
    end

    def build_edge(path)
      my_pts = contained_chain(path)
      ot_pts = path.contained_chain(self)
      return unless my_pts and ot_pts
    end


  end
end