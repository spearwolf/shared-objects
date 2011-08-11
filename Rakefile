require "rubygems"
require "bundler/setup"
require "smart_colored/extend"

desc "Build all"
task :build => ["build:js"] do
  puts "thank you and have a nice day.".bold
end

desc "Start local node server instance"
task :server do
  exec %(node ./server.js)
end

namespace :build do

  desc "Build and compress all javascript sources"
  task :js do
    require_relative "lib/JavaScriptBuilder"
    Dir["source/*.js"].each do |src|
      dst = "#{File.basename(src, ".js")}-min.js"
      puts "\t#{'building'.green.bold} #{src} -> #{dst}"
      JavaScriptBuilder.compress(src, dst)
    end
  end
end
