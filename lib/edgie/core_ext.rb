class String

  def underscore_plus
    underscore.gsub(/\s+/,'_')
  end
end

class Hash

  alias :to_ia :with_indifferent_access
end

class TrueClass

  def <=>(val)
    val ? 0 : 1
  end
end

class FalseClass

  def <=>(val)
    val ? -1 : 0
  end
end