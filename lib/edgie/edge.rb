module Edgie

  class Edge < Array

    attr_accessor :edge_id

    def ends
      [first,last]
    end
  end

end