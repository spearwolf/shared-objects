require "rubygems"
require "bundler/setup"
require "smart_colored/extend"

desc "Build all"
task :build => ["build:server", "build:www"] do
  puts "thank you and have a nice day.".bold
end

desc "Start local node server instance"
task :server do
  exec %(node ./server.js -p 8000)
end

namespace :build do
  require_relative "lib/JavaScriptBuilder"

  desc "Build javascripts [source/*.js]"
  task :server do
    Dir["source/*.js"].each do |src|
      dst = "#{File.basename(src, ".js")}-min.js"
      puts "\t#{'building'.green.bold} #{src} -> #{dst}"
      JavaScriptBuilder.compress(src, dst)
    end
  end

  desc "Build javascripts [source/www/*.js]"
  task :www do
    Dir["source/www/*.js"].each do |src|
      dst = "#{File.join("www", File.basename(src, ".js"))}-min.js"
      puts "\t#{'building'.green.bold} #{src} -> #{dst}"
      JavaScriptBuilder.compress(src, dst)
    end
  end
end
