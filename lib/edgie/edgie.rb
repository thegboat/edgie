module Edgie

  def self.create(svg_filename, output_filename = nil)

    generator = Edgie::Generator.new(svg_filename, output_filename)
    generator.run
  end

end