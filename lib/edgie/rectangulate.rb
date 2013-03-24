module Edgie
  module Rectangulate

    def self.included(base)
      base.send(:attr_reader, :ne_point, :sw_point, :nw_point, :se_point)
    end

    def adjust_rect(*coords)
      [coords].flatten.each do |coord|
        unless ne_point and sw_point
          @ne_point = @sw_point = coord
        else
          @ne_point, @sw_point = ne_point.ne_ward(coord), sw_point.sw_ward(coord)
        end
      end
      @nw_point = Coordinate.new([@sw_point.x_point, @ne_point.y_point])
      @se_point = Coordinate.new([@ne_point.x_point, @sw_point.y_point])
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

  end
end