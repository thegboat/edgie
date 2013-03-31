module Edgie

  class Map

    include Edgie::Rectangulate

    DIRNAME = "#{File.dirname(__FILE__)}/../../"

    TEMPLATE_FILE = DIRNAME + "templates/edgie.js.erb"
    SAMPLE_TEMPLATE_FILE = DIRNAME + "templates/sample.html.erb"
    SAMPLE_OUTPUT_FILENAME = DIRNAME + "test/sample.html"

    attr_reader :svg_filename, :paths, :entities, :context, :edges
    attr_writer :sample


    def initialize(*args)
      @svg_filename = args.first
      @output_filename = args[1]
      @entities = ActiveSupport::OrderedHash.new
      @edges = {}
    end

    def build
      paths_array = load_paths
      parse_paths(paths_array)
      adjust_for_origin
      build_edges
      normalize_edges

      @context = Erubis::Context.new(:map => self)

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

    def edge_directive(entity)
      entity.paths.map do |path|
        if path.edges.length == 1
          "#{path.edges.first}z"
        else
          debugger if path.path_id == 1
          path_edges = path.edges[1..-1].map {|edge_id| edges[edge_id]}
          directive = ["#{path.edges.first}"]
          prior_point = edges[path.edges.first].last

          until path_edges.empty?
            new_edge = path_edges.detect {|edge| edge.include?(prior_point)}
            directive << if new_edge.last == prior_point
              "#{new_edge.edge_id}r"
              prior_point = new_edge.first
            else
              "#{new_edge.edge_id}"
              prior_point = new_edge.last
            end
            path_edges.delete(new_edge)
          end
          directive
        end
      end.flatten.join(',')
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
          x_o = (x - (path.width/2))/path.width
          y_o = (y - (path.height/2))/path.height
          point.move!(x+x_o, y+y_o)
          new_path << point
        end
        new_path.close_path!
        paths[path_id] = new_path
        adjust_rect(new_path.ne_point, new_path.sw_point)
      end

      entities.each do |name, entity|
        entity.paths.each do |path|
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
          entity.add_path(result[counter])
          counter += 1
        end

        result
      end
    end

    def edge_priority
      @edge_rank ||= begin
        paths.values.sort_by do |path|
          -(path.midpoint - midpoint)
        end.map(&:path_id)
      end
    end

    def get_edges(path)
      path.edges.map {|edge_id| edges[edge_id]}
    end

    def build_edges

      edge_priority[0..-2].each_with_index do |target_id, index|
        target = paths[target_id]

        neighbors = edge_priority[index..-1].map {|path_id| paths[path_id] if target.neighbors?(paths[path_id]) }.compact
        if neighbors.empty?
          edge_id = "#{target_id}"
          edge = Edgie::Edge.new(target.points)
          edges[edge_id] = edge
          edge.edge_id = edge_id
          target.edges << edge_id
        else
          neighbors.each do |path|
            next unless edge = target.build_edge(path) and edge.length > 1
            edge_id = "#{target_id}-#{path.path_id}"

            edges[edge_id] = edge
            edge.edge_id = edge_id
            path.edges << edge_id
            target.edges << edge_id
              
          end
        end
      end
      true
    end

    def normalize_edges
      edge_priority.each do |target_id|
        target = paths[target_id]
        ends = target.edges.map do |edge_id|
          if edge_id == target.edges.first
            edges[edge_id].last
          elsif edge_id == target.edges.last
            edges[edge_id].first
          else
            edges[edge_id].ends
          end
        end
        ends.flatten!
        ends.reverse!

        ends[0..-2].each do |cur_end|
          break if ends.empty?
          pt = ends.sort_by {|end_pt| end_pt - cur_end}.first
          ends.delete(pt)
          cur_end.move!(pt.x_val, pt.y_val)
        end
      end
    end

  end

end