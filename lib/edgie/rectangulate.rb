module Edgie
  module Rectangulate

    def self.included(base)
      base.send(:attr_reader, :ne_point, :sw_point, :se_point, :nw_point)
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

    def neighbors?(obj)
      return false if obj == self
      !!(contained_corner(obj) || obj.contained_corner(self))
    end

  end
end