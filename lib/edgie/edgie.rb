module Edgie

  def self.create(svg_filename, output_filename = nil)

    generator = Edgie::Generator.new(svg_filename, output_filename)
    generator.run
  end

  def self.sample(svg_filename)
    generator = Edgie::Generator.new(svg_filename)
    generator.sample = true
    generator.run
  end

end