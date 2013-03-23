module Edgie
  module Rectangulate

    def self.included(base)
      base.send(:attr_reader, :ne_point, :sw_point, :nw_point, :se_point)
      #base.send(:attr_accessor, :north_most, :west_most, :south_most, :east_most)
    end

    def adjust_rect(*coords)
      [coords].flatten.each do |coord|
        unless ne_point and sw_point
          @ne_point = @sw_point = coord
          #set_critical_points(coord)
        else
          @ne_point, @sw_point = ne_point.ne_ward(coord), sw_point.sw_ward(coord)
          #set_critical_points(coord)
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
        ne_point.move(width, height)
      end
    end

    # def set_critical_points(coord)
    #   %w{east west north south}.each do |dir|
    #     if coord.send("#{dir}_of?", e_most.first)
    #       send("#{dir}_most=", [coord])
    #     elsif coord.send("#{dir}_as?", e_most.first)
    #       send("#{dir}_most=", (send("#{dir}_most") << coord))
    #     end
    #   end
    # end

    # def critical_points
    #   %w{east west north south}.map {|dir| send("#{dir}_most") }
    # end

    def contains?(coord)
      ne_point == ne_point.ne_ward(coord) && sw_point == sw_point.sw_ward(coord)
    end

    def neighbors?(obj)
      return false if obj == self
      v =   obj.contains?(ne_point)
      v ||= obj.contains?(sw_point)
      v ||= obj.contains?(nw_point)
      v ||= obj.contains?(se_point)
      v ||= contains?(obj.ne_point)
      v ||= contains?(obj.sw_point)
      v ||= contains?(obj.nw_point)
      v ||= contains?(obj.se_point)
    end

  end
end