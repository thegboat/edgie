class String

  def underscore_plus
    underscore.gsub(/\s+/,'_')
  end
end

class Hash

  alias :to_ia :with_indifferent_access
end