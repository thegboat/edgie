module Edgie
  class Coordinate
    
    attr_reader :x_val, :y_val
    attr_accessor :next_point, :prev_point

    THRESHOLD = BigDecimal('0.01')

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

      self.x_val, self.y_val = seed
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
      "[#{x_val.round(2).to_s.ljust(7)},#{y_val.round(2).to_s.ljust(7)}]"
    end
    alias :inspect :to_s
    alias :to_json :to_s

    #when we need coordinates as an array
    def to_a
      [x_val,y_val]
    end

    def slope(coord)
      h = x_offset(coord)
      v = y_offset(coord)
      v/h if h.abs > THRESHOLD
    end

    def next_slope
      slope(next_point)
    end

    def prev_slope
      slope(prev_point)
    end

    def same_sloping?(coord)
      m = slope(coord)
      return false unless prev_point
      return true if prev_slope == m
      return false if prev_slope.nil? or m.nil?
      return true if THRESHOLD > (prev_slope/m).abs
    end
    
    def x_val=(val)
      val = self.class.to_bigdec(val)
      @x_val = val && val.round(2)
    end
    
    def y_val=(val)
      val = self.class.to_bigdec(val)
      @y_val = val && val.round(2)
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
      coord = Coordinate.new([x_val, y_val])
      coord.move!(x,y)
    end

    def move!(x,y)
      self.x_val, self.y_val = [x_val + x, y_val + y]
      self
    end

    def -(val)
      args = to_a + val.to_a
      return if args.any?(&:nil?)
      self.class.distance(*args)
    end

    def x_offset(val)
      rtn = self.class.distance(x_val, 0, val.x_val, 0)
      x_val > val.x_val ? -rtn : rtn
    end

    def y_offset(val)
      rtn = self.class.distance(0, y_val, 0, val.y_val)
      y_val > val.y_val ? -rtn : rtn
    end

    def ne_ward(val)
      x = [x_val, val.x_val].min
      y = [y_val, val.y_val].min
      Coordinate.new([x, y])
    end

    def sw_ward(val)
      x = [x_val, val.x_val].max
      y = [y_val, val.y_val].max
      Coordinate.new([x, y])
    end

    def west_of?(coord)
      !coord or x_val > coord.x_val 
    end

    def east_of?(coord)
      !coord or x_val < coord.x_val 
    end

    def south_of?(coord)
      !coord or y_val > coord.y_val 
    end

    def north_of?(coord)
      !coord or y_val < coord.y_val 
    end

    def east_as?(coord)
      coord and x_val == coord.x_val 
    end
    alias :west_as? :east_as?

    def north_as?(coord)
      coord and y_val == coord.y_val 
    end
    alias :south_as? :north_as?
    
  end
end