module Edgie

  def self.create(svg_filename, output_filename = nil)

    map = Edgie::Map.new(svg_filename, output_filename)
    map.build
  end

  def self.sample(svg_filename)
    map = Edgie::Generator.new(svg_filename)
    map.sample = true
    map.build
  end

end