module Edgie

  class Generator

    include Edgie::Rectangulate

    TEMPLATE_FILE = "#{File.dirname(__FILE__)}/../../templates/edgie.js.erb"

    attr_reader :svg_filename, :paths, :entities

    def initialize(*args)
      @svg_filename = args.first
      @output_filename = args[1]
      @entities = ActiveSupport::OrderedHash.new
    end

    def run
      paths_array = load_paths
      parse_paths(paths_array)
      #build_edges

      template = load_template

      context = Erubis::Context.new(
        :widget_name => output_filename.gsub('.js', ''),
        :translation_table => translation_table,
        :paths => paths,
        :entities => entities,
        :longest_name => longest_name,
        :height => height,
        :width => width
      )

      content = template.evaluate(context)
      File.open(output_filename, 'w+').write(content)
    end

    def load_paths
      svg_file = Hash.from_xml(File.read(svg_filename))
      svg_file['svg']['path']
    end

    def load_template
      input = File.read(TEMPLATE_FILE)
      Erubis::Eruby.new(input)
    end

    def output_filename
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

          entity.adjust_rect(result[counter].ne_point, result[counter].sw_point)
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