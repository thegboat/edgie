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
      build_edges

      @context = Erubis::Context.new(
        :widget_name => widget_name,
        :translation_table => translation_table,
        :paths => paths,
        :entities => entities,
        :longest_name => longest_name,
        :height => sw_point.y_val,
        :width => ne_point.x_val
      )

      render
    end

    def widget_name
      File.basename(output_filename, File.extname(output_filename))
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
      default = File.basename(svg_filename, File.extname(svg_filename)) << ".js"
      if @output_filename
        if File.directory?(@output_filename) and @output_filename =~ /\/$/
          "#{@output_filename.chomp('/')}/#{default}"
        else
          @output_filename.chomp('.js') << ".js"
        end
      else
        default
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
      x, y = 0, -ne_point.y_val.floor + 50
      paths.each do |path_id, path|
        new_path = Edgie::Path.new(path_id)
        path.points.each do |point|
          point.move!(x, y)
          new_path << point
        end
        new_path.close_path!
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

        entity = entities[path['id'].underscore_plus] = Edgie::Entity.new(path['id'])
        subpaths = path['d'].scan(/M[C\d\.\s,]*Z/)

        subpaths.each do |subpath|
          result[counter] = Edgie::Path.new(counter)
          subpath = subpath.scan(/\d+\.\d+,\d+\.\d+/)
          subpath.uniq!

          subpath.each do |coord|
            result[counter] << coord
          end
          adjust_rect(result[counter].ne_point, result[counter].sw_point)
          entity.add_path(counter)
          counter += 1
        end

        result
      end
    end

    def edge_priority
      @edge_rank ||= begin
        paths.values.sort_by do |path|
          (path.ne_point - midpoint) + (path.sw_point - midpoint)
        end.map(&:path_id)
      end
    end

    def build_edges
      edge_priority[0..-2].each_with_index do |target_id, index|
        edge_priority[index..-1].each do |path_id|
          next unless paths[target_id].neighbors?(paths[path_id])
          paths[target_id].build_edge(paths[path_id])
        end
      end
    end

  end

end