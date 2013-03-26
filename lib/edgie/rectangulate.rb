module Edgie
  module Rectangulate

    def self.included(base)
      base.send(:attr_reader, :ne_point, :sw_point)
    end

    def adjust_rect(*coords)
      [coords].flatten.each do |coord|
        unless ne_point and sw_point
          @ne_point = @sw_point = coord
        else
          @ne_point, @sw_point = ne_point.ne_ward(coord), sw_point.sw_ward(coord)
        end
      end
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
        ne_point.move(width/2, height/2)
      end
    end

    def contains?(coord)
      ne_point == ne_point.ne_ward(coord) && sw_point == sw_point.sw_ward(coord)
    end

    def contained_corner(obj)
      return ne_point if obj.contains?(ne_point)
      return sw_point if obj.contains?(sw_point)
    end

    def neighbors?(obj)
      !!(contained_corner(obj) || obj.contained_corner(self))
    end

  end
end