const multer = require("multer");

var storage = multer.diskStorage({
    destination : function(req, file, cb){
      cb(null, "../public/image/");
    },
    filename:function(req,file,cb){
      const ext = path.extname(file.originalname);
      cb(null, path.basename(file.originalname, ext) + "-" + Date().now() + ext);
    },
  });
  
  exports.upload = multer({storage : storage});