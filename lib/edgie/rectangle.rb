module Edgie
  class Rectangle

    attr_reader :ne_point, :sw_point, :se_point, :nw_point

    def initialize(*pts)
      pts.flatten!
      adjust_rect(pts) if pts.present?
    end

    def inspect
      "#{sw_point} #{ne_point}"
    end
    alias :to_s :inspect

    def intercept(contained_coord, coord)
      return coord if contains?(coord) or !contains?(contained_coord)

      slope = coord.slope(contained_coord)

      point1 = if slope
        y_intercept = coord.y_val - (coord.x_val*slope)
        if coord.west_of?(sw_point)
          Edgie::Coordinate.new(sw_point.x_val, y_intercept + sw_point.x_val * slope)
        elsif coord.east_of?(ne_point)
          Edgie::Coordinate.new(ne_point.x_val, y_intercept + ne_point.x_val * slope)
        else
          contained_coord
        end
      end

      point2 = if slope != 0
        if slope
          y_intercept = coord.y_val - (coord.x_val*slope)
          if coord.south_of?(sw_point)
            Edgie::Coordinate.new((sw_point.y_val - y_intercept)/slope, sw_point.y_val)
          elsif coord.north_of?(ne_point)
            Edgie::Coordinate.new((ne_point.y_val - y_intercept)/slope, ne_point.y_val)
          else
            contained_coord
          end
        else
          if coord.south_of?(sw_point)
            Edgie::Coordinate.new(coord.x_val, sw_point.y_val)
          elsif coord.north_of?(ne_point)
            Edgie::Coordinate.new(coord.x_val, ne_point.y_val)
          else
            contained_coord
          end
        end
      end

      rtn = [point1,point2].compact.uniq.sort_by {|point| point - coord}.first
      rtn - contained_coord > 0.1 ? rtn : contained_coord
    end

    def crop_region(path)
      head = tail = nil
      pts = path.points

      pts.each do |pt|
        if contains?(pt)
          head = pt unless contains?(pt.prev_point)
          tail = pt unless tail or contains?(pt.next_point) 
        end
        break if head and tail
      end

      return pts unless head and tail
      
      new_head = intercept(head, head.prev_point)

      if head != new_head
        path.splice(new_head, head) 
        head = new_head
      end

      new_tail = intercept(tail, tail.next_point)

      if tail != new_tail
        path.splice(tail, new_tail)
        tail = new_tail
      end

      head.chain(tail)
    end

    def adjust_rect(*coords)
      [coords].flatten.each do |coord|
        unless ne_point and sw_point
          @ne_point = @sw_point = coord
        else
          @ne_point, @sw_point = ne_point.ne_ward(coord), sw_point.sw_ward(coord)
        end
      end
      @nw_point = Edgie::Coordinate.new(sw_point.x_val, ne_point.y_val)
      @se_point = Edgie::Coordinate.new(ne_point.x_val, sw_point.y_val)
      return [coords].flatten
    end

    def height
      ne_point.y_offset(sw_point).abs
    end

    def width
      ne_point.x_offset(sw_point).abs
    end

    def midpoint
      if ne_point != sw_point
        nw_point.move(width/2, height/2)
      end
    end

    def ==(rect)
      rect.is_a?(self.class) and ne_point - rect.ne_point < 1 and sw_point - rect.sw_point < 1
    end
    alias :eq1? :==

    def >(rect)
      ne_point - sw_point > rect.ne_point - rect.sw_point
    end

    def <(rect)
      ne_point - sw_point < rect.ne_point - rect.sw_point
    end

    def contains?(coord)
      v =   ne_point.north_of?(coord) or ne_point.north_as?(coord)
      v &&= sw_point.south_of?(coord) or sw_point.south_as?(coord)
      v &&= ne_point.east_of?(coord) or ne_point.east_as?(coord) 
      v &&= sw_point.west_of?(coord) or sw_point.west_as?(coord) 
    end

    def contained_corner(obj)
      return ne_point if obj.contains?(ne_point)
      return sw_point if obj.contains?(sw_point)
      return se_point if obj.contains?(se_point)
      return nw_point if obj.contains?(nw_point)
    end

  end
end