require 'spec_helper'

describe "basic operations" do

  it "should know its bounds" do
    rect = Rectangle.new
    rect.adjust_rect(Edgie::Coordinate.new(0,0))
    rect.adjust_rect(Edgie::Coordinate.new(1,1))
    rect.ne_point.x_point.should eq(0)
    rect.ne_point.y_point.should eq(0)
    rect.sw_point.x_point.should eq(1)
    rect.sw_point.y_point.should eq(1)
    rect.se_point.x_point.should eq(0)
    rect.se_point.y_point.should eq(1)
    rect.nw_point.x_point.should eq(1)
    rect.nw_point.y_point.should eq(0)
  end

end