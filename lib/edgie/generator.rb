module Edgie

  class Generator

    include Edgie::Rectangulate

    DIRNAME = "#{File.dirname(__FILE__)}/../../"

    TEMPLATE_FILE = DIRNAME + "templates/edgie.js.erb"
    SAMPLE_TEMPLATE_FILE = DIRNAME + "templates/sample.html.erb"
    SAMPLE_OUTPUT_FILENAME = DIRNAME + "test/sample.html"

    attr_reader :svg_filename, :paths, :entities, :context
    attr_writer :sample


    def initialize(*args)
      @svg_filename = args.first
      @output_filename = args[1]
      @entities = ActiveSupport::OrderedHash.new
    end

    def run
      paths_array = load_paths
      parse_paths(paths_array)
      adjust_for_origin

      @context = Erubis::Context.new(
        :widget_name => output_filename.gsub('.js', ''),
        :translation_table => translation_table,
        :paths => paths,
        :entities => entities,
        :longest_name => longest_name,
        :height => sw_point.y_point,
        :width => sw_point.x_point
      )

      render
    end

    def render
      template = load_template

      content = template.evaluate(context)
      file = File.open(output_filename, 'w+')
      rtn = file.write(content)
      file.close
      rtn
    end

    def sample?
      @sample
    end

    def load_paths
      svg_file = Hash.from_xml(File.read(svg_filename))
      svg_file['svg']['path']
    end

    def load_template
      input = File.read(sample? ? SAMPLE_TEMPLATE_FILE : TEMPLATE_FILE)
      Erubis::Eruby.new(input)
    end

    def output_filename
      return SAMPLE_OUTPUT_FILENAME if sample? 
      if @output_filename
        @output_filename =~ /\.js$/ ? @output_filename : (@output_filename + ".js")
      else
        File.basename(svg_filename, File.extname(svg_filename)) << ".js"
      end
    end

    def translation_table
      keys = entities.keys
      keys.sort!
      rtn = {}
      keys.each_with_index do |key,index|
        rtn[(index + 1).to_s] = key 
      end
      rtn.to_json
    end

    def longest_name
      entities.keys.map(&:length).max.to_i + 5
    end

    def adjust_for_origin
      paths.each do |path_id, path|
        new_path = Edgie::Path.new(path_id)
        path.points.each do |point|
          point.move!(-ne_point.x_point.floor, -ne_point.y_point.floor)
          new_path << point
        end
        paths[path_id] = new_path
        adjust_rect(new_path.ne_point, new_path.sw_point)
      end

      entities.each do |name, entity|
        entity.paths.each do |path_id|
          path = paths[path_id]
          entity.adjust_rect(path.ne_point, path.sw_point)
        end
      end
    end

    def parse_paths(paths_array)
      counter = 1

      @paths = paths_array.inject(ActiveSupport::OrderedHash.new) do |result,path|

        entity = entities[path['id'].downcase] = Edgie::Entity.new(path['id'])
        subpaths = path['d'].scan(/M[C\d\.\s,]*Z/)

        subpaths.each do |subpath|
          result[counter] = Edgie::Path.new(counter)

          subpath.scan(/\d+\.\d+,\d+\.\d+/).each do |coord|
            result[counter] << coord
          end
          adjust_rect(result[counter].ne_point, result[counter].sw_point)
          entity.add_path(counter)
          counter += 1
        end

        result
      end
    end

  end

end