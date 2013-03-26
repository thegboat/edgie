require 'spec_helper'

describe Edgie::Path do

  describe "adding points" do

    it "should start empty" do
      path = Edgie::Path.new
      path.empty?.should eq(true)
      path.present?.should eq(false)
      path.index(Edgie::Coordinate.new(0,0)).should eq(nil)
      path.length.should eq(0)
      path.first.should eq(nil)
      path.last.should eq(nil)
    end

    it "should add points correctly" do

      path = Edgie::Path.new
      coord = Edgie::Coordinate.new(0,0)
      path.add_point(coord)
      path.empty?.should eq(false)
      path.present?.should eq(true)
      path.index(coord).should eq(0)
      path.length.should eq(1)
      path.first.should eq(coord)
      path.last.should eq(coord)
    end

    it "should close path  correctly" do
      path = Edgie::Path.new


      path << coord1 = Edgie::Coordinate.new(1,1)
      path << coord2 = Edgie::Coordinate.new(2,2)
      path << coord3 = Edgie::Coordinate.new(1,2)

      path.close_path!

      path.first.should eq(path.last)
    end
  end

end