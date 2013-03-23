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
  end

  describe "splicing" do

    it "should splice correctly" do

      path = Edgie::Path.new

      path.add_point(0,0)
      path.add_point(1,2)
      path.add_point(2,3)
      path.add_point(5,5)
      path.add_point(3,5)
      path.add_point(0,0)

      path.length.should eq(6)

      other_path = Edgie::Path.new

      other_path.add_point(4,4)
      other_path.add_point(4,2)

      path.splice(1,2, other_path)

      path.points.should include(other_path.first)
      path.points.should include(other_path.last)
      path.points.should_not include(Edgie::Coordinate.new(1,2))
      path.points.should_not include(Edgie::Coordinate.new(2,3))
      path.length.should eq(6)

    end
  end

  describe "pivoting" do

    it "should pivot correctly" do

      path = Edgie::Path.new

      path.add_point(0,0)
      path.add_point(1,2)
      path.add_point(2,3)
      path.add_point(5,5)
      path.add_point(3,5)
      path.add_point(0,0)

      path.pivot(2)

      other_path = Edgie::Path.new

      other_path.add_point(2,3)
      other_path.add_point(5,5)
      other_path.add_point(3,5)
      other_path.add_point(0,0)
      other_path.add_point(1,2)
      other_path.add_point(2,3)

      path.should eq(other_path)
    end
  end

end