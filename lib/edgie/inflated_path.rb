module Edgie
  class InflatedPath

    STEP = BigDecimal('0.1')

    attr_accessor :proxy

    def initialize(seed)
      @proxy = seed.flatten
      inflate
    end

    def inflate
      @inflated = []

      prior = proxy.first

      proxy[1..-1].each do |point|
        slope = point.slope(prior)
        cur = if slope
          y_intercept = point.y_point - (point.x_point*slope)

          if slope.abs > 1
            by = prior.y_point > point.y_point ? -STEP : STEP
            (prior.y_point+by).step(point.y_point - by, by).to_a.map do |y|
              Edgie::Coordinate.new((y - y_intercept)/slope, y)
            end
          else
            by = prior.x_point > point.x_point ? -STEP : STEP
            (prior.x_point+by).step(point.x_point - by, by).to_a.map do |x|
              Edgie::Coordinate.new(x, y_intercept + (x * slope))
            end
          end

        else
          by = prior.y_point > point.y_point ? -STEP : STEP

          (prior.y_point+by).step(point.y_point - by, by).to_a.map do |y|
            Edgie::Coordinate.new(point.x_point, y)
          end
        end
        debugger if cur.empty?
        prior = point
        @inflated << cur
      end

      @inflated = proxy[1..-2].map {|i| [i]} if @inflated.empty?
    end

    def inflated
      @flattened ||= @inflated.flatten
    end

    def inspect
      proxy.zip(@inflated).flatten(1).inspect
    end

    def find_deflated_index(coord)
      idx = inflated.index(coord)
      res = 0; sum = 0;
      @inflated.each_with_index do |list,i|
        sum += list.length
        break if sum > idx
        res = i
      end

      res

    end

    def self.approximate(ary, list)

      pt = orig_pt = nil
      ary.each do |pt1|
        tmp = list.select {|pt2| pt2 - pt1 < 3}
        pt = tmp.sort_by {|pt2| pt2 - pt1 }.first
        if pt
          orig_pt = pt1
          break
        end
      end
      [orig_pt, pt]
    end

    def self.failsafe(ary,list)
      pt = orig_pt = dist = fsafe = nil
      ary.each do |pt1|
        fsafe = list.sort_by {|pt2| pt2 - pt1 }.first
        if !dist || dist > fsafe - pt1
          dist = fsafe - pt1
          pt = fsafe
          orig_pt = pt1
        end
      end
      [orig_pt, pt]
    end

    def find_head(ary)
      orig_pt, head = self.class.approximate(ary,inflated)

      unless head
        orig_pt, head = self.class.failsafe(ary,inflated)
      end

      idx = find_deflated_index(head)

      [orig_pt, proxy[idx + 1]]
    end

    def find_tail(ary)
      orig_pt, tail = self.class.approximate(ary.reverse,inflated.reverse)

      unless tail
        orig_pt, tail = self.class.failsafe(ary.reverse,inflated.reverse)
      end
      
      idx = find_deflated_index(tail)

      [orig_pt, proxy[idx - 1]]
    end
  end
end