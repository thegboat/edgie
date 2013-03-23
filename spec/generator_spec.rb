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

  describe "svg file load" do
    it "should load a svg file correctly" do

      generator = Edgie::Generator.new("spec/test.svg")
      paths_array = generator.load_paths
      paths_array.should be_an_instance_of(Array)
      paths_array.all? {|h| h.is_a?(Hash) && h.key?('id')}.should be (true)
    end
  end

end