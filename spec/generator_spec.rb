require 'spec_helper'

describe Edgie::Generator do

  describe "output filename" do
    it "should be equal to the svg with js extension when no output filename given" do
      generator = Edgie::Generator.new("svg_file.svg")
      generator.output_filename.should eq("svg_file.js")
    end

    it "should be the submitted filename when one is submitted" do
      generator = Edgie::Generator.new("svg_file.svg", "map")
      generator.output_filename.should eq("map.js")
    end
  end

end