
require("http").createServer(function (req,res) {
  res.writeHead(200,{});
  res.end("hej, this is spearwolf.no.de!");
}).listen(80);

