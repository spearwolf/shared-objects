require "yui/compressor"
require "closure-compiler"
require "coffee-script"

class JavaScriptBuilder

  attr_accessor :base_js

  def initialize(base_js)
    self.base_js = base_js
  end

  def compress
    @content = ""
    File.new(base_js).readlines.each do |line|
      if line =~ /\/\/\s+@include\s+"([^)]+)"\s*$/
        js_file = $1.chomp
        @content << compress_single_js_file(js_file).chomp << "\n"
      else
        @content << line
      end
    end
    compress_with_yui @content
    #compress_with_closure @content
  end

  class << self
    def compress(base_js, target_js)
      File.open(target_js, "w") {|f| f.write(new(base_js).compress) }
    end
  end

  private

  def compress_single_js_file(js_file)
    path = File.absolute_path(File.join(File.dirname(base_js), js_file))
    content = path =~ /\.coffee$/ ? compile_coffee_script(path) : File.read(path)
    compress_with_closure(content)
  end

  def compress_with_yui(content)
    YUI::JavaScriptCompressor.new.compress(content)
  end

  def compress_with_closure(content)
    Closure::Compiler.new.compress(content)
  end

  def compile_coffee_script(file)
    CoffeeScript.compile File.read(file)
  end

end
