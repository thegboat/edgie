module Edgie
  class Path

    include Edgie::Rectangulate

    attr_reader :points, :path_id
    # attr_accessor :neighbors

    delegate :empty?, :present?, :length, :index, :first, :last, :reverse!, :inspect, :to => :points

    def initialize(path_id = nil)
      @path_id = path_id
      @points = []
      # @neighbors = []
    end

    def closed?
      first == last
    end

    def pivot(idx)
      return points if idx == 0
      idx = length + idx if idx < 0
      @points = if closed?
        points[idx..-1] + points[1..idx-1] + points[idx..idx]
      else
        points[idx..-1] + points[0..idx-1]
      end
    end

    def add_point(*args)
      coord = args.first.is_a?(Edgie::Coordinate) ? args.first : Edgie::Coordinate.new(args) 
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

    # def add_neighbor(path_id)
    #   self.neighbors |= [path_id]
    # end

    def select(&blk)
      new_path = self.class.new
      points.each do |point|
        next unless yield(point)
        new_path.add_point(point)
      end
      new_path
    end

    # def make_rect(path)
    #   rect = Rectangle.new
    #   rect.adjust_rect(path.select {|point| contains?(point)})
    #   rect.adjust_rect(select {|point| path.contains?(point)})
    #   rect
    # end

    def intercept(contained_coord, coord)

      slope = coord.slope(contained_coord)

      point1 = if slope
        y_intercept = coord.y_point - (coord.x_point*slope)
        if coord.west_of?(sw_point)
          Edgie::Coordinate.new(sw_point.x_point - 0.5, y_intercept + (sw_point.x_point * slope))
        elsif coord.east_of?(ne_point)
          Edgie::Coordinate.new(ne_point.x_point + 0.5, y_intercept + (ne_point.x_point * slope))
        else
          coord
        end
      end

      point2 = if slope != 0
        if slope
          y_intercept = coord.y_point - (coord.x_point*slope)
          if coord.south_of?(sw_point)
            Edgie::Coordinate.new((sw_point.y_point - y_intercept)/slope, sw_point.y_point - 0.5)
          elsif coord.north_of?(ne_point)
            Edgie::Coordinate.new((ne_point.y_point - y_intercept)/slope, ne_point.y_point + 0.5)
          else
            coord
          end
        else
          if coord.south_of?(sw_point)
            Edgie::Coordinate.new(coord.x_point, sw_point.y_point - 0.5)
          elsif coord.north_of?(ne_point)
            Edgie::Coordinate.new(coord.x_point, ne_point.y_point + 0.5)
          else
            coord
          end
        end
      end

      [point1,point2].compact.sort_by {|point| point - coord}.first
    end

    def head_idx(c_point, path)
      start = index(c_point)
      idx = start - 1
      while path.contains?(points[idx]); idx -= 1; end
      head = path.intercept(points[idx+1], points[idx])
      [idx, head]
    end

    def tail_idx(c_point, path)
      start = index(c_point)
      idx = [start + 1,length - 1].max
      while 
        path.contains?(points[idx])
        idx += 1
        idx = 1 if idx == length
      end
      tail = path.intercept(points[idx-1], points[idx])
      [idx,tail]
    end

    def splice(idx0, idx1, path)
      @points[idx0..idx1] = path.is_a?(Edgie::Path) ? path.points : path
      if points.first != points.last
        if idx0 == 0
          @points[-1] = points.first
        else
          @points[0] = points.last
        end
      end
    end

    def inflate_for(path)

      c_point = points.detect {|point| path.contains?(point) }

      idx, head = head_idx(c_point, path)
      splice(idx, idx, [points[idx], head].uniq)
      pivot(idx+1)
      idx0 = idx

      idx, tail = tail_idx(c_point, path)
      splice(idx, idx, [tail, points[idx]].uniq)
      idx1 = idx

      prior = head
      border = points[idx0+1..idx1-1].map do |point|
        slope = point.slope(head)
        rtn = if slope
          by = prior.y_point > point.y_point ? BigDecimal('-0.1') : BigDecimal('0.1')
          y_intercept = point.y_point - (point.x_point*slope)
          if slope.abs < 1
            by = prior.y_point > point.y_point ? BigDecimal('-0.1') : BigDecimal('0.1')
            (prior.y_point+by).step(point.y_point - by, by).to_a.map do |y|
              Edgie::Coordinate.new((y - y_intercept)/slope, y)
            end
          else
            by = prior.x_point > point.x_point ? BigDecimal('-0.1') : BigDecimal('0.1')
            (prior.x_point+by).step(point.x_point - by, by).to_a.map do |x|
              Edgie::Coordinate.new(x, y_intercept + (x * slope))
            end
          end
        else
          by = prior.y_point > point.y_point ? BigDecimal('-0.1') : BigDecimal('0.1')
          (prior.y_point+by).step(point.y_point - by, by).to_a.map do |y|
            Edgie::Coordinate.new(point.x_point, y)
          end
        end
        prior = point
        rtn
      end
      border.flatten!

      border
    end

    def self.search(coord, coords)
      valid = coords.select {|point| (coord - point) < 1}
      valid.sort_by {|point| coord - point}.first
    end

    def build_edge(path)
      debugger
      pivot_for(path)
      path.pivot_for(self)

      # ary0 = points.select {|point| path.contains?(point)}
      # ary1 = path.points.select {|point| contains?(point)}

      # if (ary0.first - ary1.first) >  (ary0.first - ary1.last)
      #   path.reverse!
      #   path.pivot(1)
      #   path.pivot_for(self)
      #   ary1 = path.points.select {|point| contains?(point)}
      # end

    end

    def pivot_for(path)
      idx = nil
      points.each_with_index do |point, i|
        if path.contains?(point)
          idx = i; break;
        end
      end
      if idx
        prior = idx == 0 ? -2 : idx-1
        head = path.intercept(points[idx], points[prior])
        splice(idx,idx, [head, points[idx]])
        pivot(idx)
      end
    end



    # def build_edge(path)

    #   #we have an inflated path so we can be more precise
    #   border = path.inflate_for(self)
    #   tail = head = nil
    #   idxes = []

    #   #find the first common point then the last
    #   points.each_with_index do |point, b_idx|
    #     if path.contains?(point)
    #       idx = self.class.search(point, border)
    #       if idx
    #         unless head
    #           head = [b_idx, idx]
    #         else
    #           tail = [point, idx]
    #         end
    #       end
    #       idxes << idx
    #     end
    #   end

    #   idx0 = idx1 = nil
    #   s,e = [head.last, tail.last].sort
    #   temp = border[s..e]

    #   path.points.each_with_index do |point, b_idx|
    #     if contains?(point)
    #       temp.include?(point)
    #       idx0 = b_idx
    #       break
    #     end
    #   end

    #   temp = temp.reverse

    #   path.points.reverse.each do |point|
    #     if contains?(point)
    #       temp.include?(point)
    #       idx1 = path.points.index(point)
    #       break
    #     end
    #   end

    #   pivot(head.first)

    #   path.splice(idx0, idx1, points[0..index(tail.first)])


    # end


  end
end