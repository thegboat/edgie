module Edgie

  class Generator

    attr_reader :svg_filename

    def initialize(svg_file, filename = nil)

      @output_filename = filename
      @svg_filename = svg_file

    end

    def output_filename
      if @output_filename
        @output_filename =~ /\.js$/ ? @output_filename : (@output_filename << ".js")
      else
        File.basename(svg_filename, File.extname(svg_filename)) << ".js"
      end
    end

    def run
      @svg_hash = Hash.from_xml(File.read(filename))
    end

  end

end