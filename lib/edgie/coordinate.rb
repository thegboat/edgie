module Edgie
  class Coordinate
    
    attr_reader :x_point, :y_point

    def initialize(*args)

      arg1, arg2 = [args].flatten

      seed = if arg1.is_a?(Array) or arg1.is_a?(self.class)
        arg1.to_a
      elsif arg1.is_a?(String)
        arg1.split(',')
      elsif arg2
        [arg1,arg2]
      else
        [0,0]
      end

      self.x_point, self.y_point = seed
    end

    def self.new_or_self(*args)
      args.first.is_a?(self) ? args.first : new(*args)
    end

    def self.to_bigdec(*args)
      rtn = args.map do |v|
        (v.nil? or v.is_a?(BigDecimal)) ? v : BigDecimal(v.to_f.to_s)
      end
      rtn.length < 2 ? rtn.first : rtn
    end

    def self.distance(*args)
      x1, y1, x2, y2 = args
      to_bigdec(Math.sqrt((x1-x2)**2 + (y1-y2)**2))
    end
    
    #string representation
    def to_s
      "[#{x_point.round(2).to_s.ljust(7)},#{y_point.round(2).to_s.ljust(7)}]"
    end
    alias :inspect :to_s
    alias :to_json :to_s

    #when we need coordinates as an array
    def to_a
      [x_point,y_point]
    end

    def slope(coord)
      h = x_offset(coord)
      v = y_offset(coord)
      v/h if h.abs > BigDecimal('0.004')
    end
    
    def x_point=(val)
      val = self.class.to_bigdec(val)
      @x_point = val && val.round(2)
    end
    
    def y_point=(val)
      val = self.class.to_bigdec(val)
      @y_point = val && val.round(2)
    end

    #equality and usage as a key in a hash require this
    def ==(val)
      val.is_a?(Edgie::Coordinate) && to_a == val.to_a
    end
    alias :eql? :==
    
    #usage as a key in a hash requires this
    def hash
      to_a.hash
    end

    def move(x,y)
      coord = Coordinate.new([x_point, y_point])
      coord.move!(x,y)
    end

    def move!(x,y)
      self.x_point, self.y_point = [x_point + x, y_point + y]
      self
    end

    def -(val)
      args = to_a + val.to_a
      return if args.any?(&:nil?)
      self.class.distance(*args)
    end

    def x_offset(val)
      rtn = self.class.distance(x_point, 0, val.x_point, 0)
      x_point > val.x_point ? -rtn : rtn
    end

    def y_offset(val)
      rtn = self.class.distance(0, y_point, 0, val.y_point)
      y_point > val.y_point ? -rtn : rtn
    end

    def ne_ward(val)
      x = [x_point, val.x_point].min
      y = [y_point, val.y_point].min
      Coordinate.new([x, y])
    end

    def sw_ward(val)
      x = [x_point, val.x_point].max
      y = [y_point, val.y_point].max
      Coordinate.new([x, y])
    end

    def west_of?(coord)
      !coord or x_point > coord.x_point 
    end

    def east_of?(coord)
      !coord or x_point < coord.x_point 
    end

    def south_of?(coord)
      !coord or y_point > coord.y_point 
    end

    def north_of?(coord)
      !coord or y_point < coord.y_point 
    end

    def east_as?(coord)
      coord and x_point == coord.x_point 
    end
    alias :west_as? :east_as?

    def north_as?(coord)
      coord and y_point == coord.y_point 
    end
    alias :south_as? :north_as?
    
  end
end