class String

  def underscore_plus
    underscore.gsub(/\s+/,'_')
  end
end