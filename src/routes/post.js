const express = require("express");
const postController = require("../controllers/postController");
const check_verified = require("../middlewares/auth");
const route = express.Router();

const { postUploader } = require("../middlewares/multer");

route.get("/", postController.getPost.bind(postController));
route.get("/:id", postController.getById.bind(postController));
route.get("/user/:id", postController.getPostByUserId.bind(postController));
route.get("/search", postController.getPostByFilter.bind(postController));

route.delete(
  "/:id",
  check_verified,
  postController.deleteById.bind(postController)
);

route.patch(
  "/:id",
  check_verified,
  postController.updateById.bind(postController)
);

// route.post("/", check_verified, postController.create.bind(postController));
route.post(
  "/",
  check_verified,
  postUploader({
    destinationFolder: "post",
    prefix: "POST",
    filetype: "image",
  }).single("image"),
  postController.create.bind(postController)
);

module.exports = route;
