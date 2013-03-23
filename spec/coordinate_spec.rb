require 'spec_helper'

describe Edgie::Coordinate do
  
  describe "initialization" do
    it "should be initializable with string" do
      coord = Edgie::Coordinate.new("1,1")
      coord.x_point.should eq(1)
      coord.y_point.should eq(1)
    end

    it "should be initializable with array" do
      coord = Edgie::Coordinate.new([1,1])
      coord.x_point.should eq(1)
      coord.y_point.should eq(1)
    end

    it "should be initializable with arguments" do
      coord = Edgie::Coordinate.new(1,'1')
      coord.x_point.should eq(1)
      coord.y_point.should eq(1)
    end

    it "should be initializable with Coordinate and create a dupe" do
      first_coord = Edgie::Coordinate.new(1,'1')
      coord = Edgie::Coordinate.new(first_coord)
      coord.object_id.should_not eq(first_coord.object_id)
      coord.should eq(first_coord)
    end
  end
  
  describe "y_point=, x_point=" do
    it "should set y_point/x_point" do
      coords = Edgie::Coordinate.new(0,0)
      coords.y_point.should eq(0)
      coords.x_point.should eq(0)
      coords.y_point = 1
      coords.y_point.should eq(1)
      coords.x_point = 1
      coords.x_point.should eq(1)
    end
  end
  
  describe "-" do
    it "should return the distance between two coordinates" do
      x_y = [2,2]
      coords1 = Edgie::Coordinate.new(0,0)
      coords2 = Edgie::Coordinate.new(*x_y)
      (coords1 - coords2).should eq(Edgie::Coordinate.distance(0,0,*x_y))
      (coords1 - x_y).should eq(Edgie::Coordinate.distance(0,0,*x_y))
    end
  end
      
  describe "to_a" do
    it "should return [x_point,y_point] of Cooridnates object" do
      coords = Edgie::Coordinate.new(0,1)
      coords.to_a.should eq([BigDecimal('0'), BigDecimal('1')])
    end
  end
    
  describe "==, eql?" do
    it "should be true when x and y are the same" do
      x_y = [2,2]
      coords1 = Edgie::Coordinate.new(*x_y)
      coords2 = Edgie::Coordinate.new(*x_y)
      (coords1 == coords2).should eq(true)
      (coords1.eql?(coords2)).should eq(true)
    end
    
    it "should be false when x and y are not the same" do
      x_y = [2,2]
      coords1 = Edgie::Coordinate.new(1,1)
      coords2 = Edgie::Coordinate.new(*x_y)
      (coords1 == coords2).should eq(false)
      (coords1 == x_y).should eq(false)
      (coords1.eql?(coords2)).should eq(false)
      (coords1.eql?(x_y)).should eq(false)
    end
  end
  
  describe "hash, eql?" do
    it "should recognize equal coordinates as the same key in a hash" do
      x_y = [2,2]
      hash = {}
      coords1 = Edgie::Coordinate.new(*x_y)
      coords2 = Edgie::Coordinate.new(*x_y)
      hash[coords1].should eq(nil)
      hash[coords1] = 'value'
      hash[coords2].should eq('value')
      hash.has_key?(coords2).should eq(true)
    end
  end
end