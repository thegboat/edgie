module Edgie
  module Rectangulate

    def self.included(base)
      base.send(:delegate, :ne_point, :sw_point, :se_point, :nw_point, :to => :rect)
      base.send(:delegate, :adjust_rect, :contains?, :contained_corner, :intercept, :to => :rect)
      base.send(:delegate, :height, :width, :midpoint, :to => :rect)
    end

    def rectangle
      @rectangle ||= Rectangle.new
    end

    alias :rect :rectangle


    def reset_rect(*coords)
      @rectangle = Rectangle.new(*coords)
    end

    def neighbors?(obj)
      return false if obj == self
      !!(rect.contained_corner(obj) || obj.rect.contained_corner(self))
    end

  end
end